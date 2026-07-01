---
name: cram-technical-implementation
description: >-
  The Technical Implementation Handbook for the CRAM Customer Risk Assessment
  Methodology — the developer/system guide that specifies HOW to build the CRR
  system in code. Use this skill WHENEVER work touches the technical build or
  needs exact engineering detail: the composite-score formula and parameter
  weight re-normalisation, the override-engine pseudocode, missing-data /
  BLOCKED handling, system rating codes (MATH_LOW/MEDIUM/HIGH/INCOMPLETE), the
  system component architecture, the configuration table schema (CRAM_FACTOR_WEIGHTS,
  CRAM_PARAMETERS, CRAM_RATING_DESCRIPTORS, CRAM_COUNTRY_LIBRARY,
  CRAM_PRODUCT_BASELINE, CRAM_OVERRIDE_RULES, CRAM_OCCUPATION_LIBRARY), the
  model_version_id lifecycle, the REST API specs (POST /crr/score, GET
  /crr/history, PATCH /crr/config with maker-checker headers), the screening
  orchestrator and result-handling SLAs, the immutable audit-field list and
  retention policy, the review-scheduler logic (grace period, overdue actions),
  the event-hook rescore priorities, and the SIT/UAT test pack. Trigger even
  when the user only says "what's the scoring formula", "how do I compute the
  composite", "show the API", "what columns are in the config table", "what's
  the audit schema", "how does the override engine pick the rating", "what fires
  on a sanctions hit", or "write the SIT case". Companion skills:
  cram-risk-methodology (the model logic) and cram-implementation-brd (the BRD).
  Model reference: CRAM-CBUAE-2026-June (canonical version CRAM-CBUAE-2026-05-FREEZE-01).
---

# CRAM Technical Implementation Handbook

This skill is the **developer & system guide** for building the CRR system. It
turns the methodology into concrete formulas, schemas, APIs and engineering
rules. Read alongside:

- **`cram-risk-methodology`** — the model logic (weights, parameter libraries, overrides, outcomes).
- **`cram-implementation-brd`** — the business requirements (scope, FR/NFR/RPT, acceptance).

- **Model reference:** `CRAM-CBUAE-2026-June` · **Version:** 1.0 · **Audience:** Technology / Engineering / Platform / QA
- Canonical stored `model_version_id`: `CRAM-CBUAE-2026-05-FREEZE-01`.

## When to read the reference files

This SKILL.md carries the architecture, the scoring formula/pseudocode and
missing-data rules. Open a reference file for the rest:

| Need | Read |
|------|------|
| Configuration table schema, `model_version_id` lifecycle, and the REST API specs (score / history / update-config) | `references/config-schema-and-apis.md` |
| Screening orchestration + result-handling SLAs, mandatory immutable audit fields, retention policy, review scheduler, event-hook rescore priorities | `references/screening-audit-scheduling.md` |
| The handbook SIT test pack (TC-001…TC-012, the 12 mandatory) and UAT sign-off requirements | `references/sit-uat-test-pack.md` |

## 1. System components and architecture

| Component | Function | Integration point |
|---|---|---|
| **CRR Scoring Engine** | Applies factor weights and parameter scores to produce the composite; evaluates override rules; determines final rating | Core onboarding platform; periodic-review scheduler; event-driven rescore API |
| **Configuration Service** | Stores factor weights, parameter descriptors, rating bands, country library, product baseline, override rules | Versioned config store; consumed by the Scoring Engine; updated only via the Change Control API with maker-checker |
| **Screening Orchestrator** | Calls sanctions/TFS, PEP, adverse-media, watchlist vendors; parses and stores results; triggers overrides | Pre-onboarding flow; ongoing list-update events; transaction screening where applicable |
| **Override Engine** | Evaluates all 20 OVR rules against screening results, scoring inputs and system flags; returns the most restrictive floor | Post-scoring step; inputs from Screening Orchestrator and Scoring Engine |
| **Audit Store** | Immutable record of all CRR inputs, scores, override results, approvals and the config version at scoring time | Event-sourced, append-only; no update/delete except under strict retention policy |
| **Review Scheduler** | Tracks review due dates by rating; generates overdue queues; triggers event-driven rescores | Core banking lifecycle; CRR event hooks; compliance workflow |
| **Change Control API** | Validates maker-checker approval before updating config tables; increments `model_version_id`; archives prior version | Config Service; approval workflow; audit store |

## 2. Composite score formula (authoritative arithmetic)

```
composite_score =
    Σ over factors {
        [ Σ over parameters in factor (
              parameter_score × parameter_weight
          ) / Σ (parameter_weights present in factor)
        ] × factor_weight
    }
```

Where:
- `parameter_score ∈ {1 = Low, 2 = Medium, 3 = High}`.
- `parameter_weight` = approved weight per parameter per segment & lifecycle.
- `factor_weight` = approved weight per factor per segment & lifecycle.
- All parameter weights within a factor sum to 1.0; all factor weights within a segment-lifecycle sum to 1.0.
- Result: `composite_score ∈ [1.0000, 3.0000]`, stored to **4 decimal places**.

**Key engineering detail — within-factor re-normalisation.** The inner term
divides by the **sum of the parameter weights actually present** in the factor.
This is what makes optional/omitted parameters safe: when an optional parameter
is omitted, the remaining parameters' weights re-normalise so the factor score
stays on the 1–3 scale (see §4). Mandatory parameters can never be omitted —
they BLOCK instead.

### 2.1 Mathematical rating mapping (with system codes)

| Composite score range | Mathematical rating | System code |
|---|---|---|
| 1.0000 – 1.5000 | Low | `MATH_LOW` |
| 1.5001 – 2.1500 | Medium | `MATH_MEDIUM` |
| 2.1501 – 3.0000 | High | `MATH_HIGH` |
| N/A (incomplete) | Pending / Incomplete | `MATH_INCOMPLETE` |

Band decisions use the **unrounded** composite. No rounding before band mapping.

## 3. Override engine logic (pseudocode)

```python
def determine_final_rating(math_rating, override_results):
    if any(ovr.outcome == 'PROHIBITED' for ovr in override_results if ovr.triggered):
        return 'PROHIBITED'
    if any(ovr.outcome == 'HIGH_FLOOR' for ovr in override_results if ovr.triggered):
        floor = 'HIGH'
    elif any(ovr.outcome == 'MEDIUM_FLOOR' for ovr in override_results if ovr.triggered):
        floor = 'MEDIUM'
    else:
        floor = None
    rating_order = {'Low': 1, 'Medium': 2, 'High': 3}
    return max(math_rating, floor, key=lambda r: rating_order.get(r, 0))
```

The engine returns the **most restrictive** of the mathematical rating and any
triggered floor; a triggered prohibition short-circuits to `PROHIBITED`. This
implements non-dilution: a Low/Medium math score can never lower a triggered
High/Medium floor. (Outcome strings map to the OVR rules in the
`cram-risk-methodology` skill → `overrides-and-floors.md`.)

## 4. Missing-data handling

- If a **mandatory** parameter has no input, the parameter score must **NOT**
  default to 1 (Low).
- Missing mandatory parameters return a **BLOCKED** status and prevent final
  rating calculation. `math_rating = MATH_INCOMPLETE`.
- The system must **list all missing parameters** in the blocking message.
- **Optional** parameters (flagged in config) may be omitted without blocking;
  the factor score is computed from the scored parameters only, with their
  weights **re-normalised** (the `/ Σ(parameter_weights present)` term in §2).

## 5. `model_version_id` lifecycle (summary)

1. Current active version: `CRAM-CBUAE-2026-June` (canonical frozen identifier `CRAM-CBUAE-2026-05-FREEZE-01`).
2. Every scoring record stores the `model_version_id` active at scoring time.
3. On approved config change, the Change Control API increments the version suffix (e.g. `…-Version-02`) and writes a new `effective_from`.
4. The prior version stays queryable for audit but is not used for new assessments.

Full schema, change-control rules and APIs are in
`references/config-schema-and-apis.md`.

## 6. Cross-document reconciliation notes

- **Scheduler vs methodology:** the base scheduler sets High = +12 months
  (§ scheduler). The methodology adds a **6-month** sub-case for very-high-risk
  PEP / digital-fraud / correspondent customers — honour the tighter cycle.
- **Sanctions SLA:** the handbook's result table sets a 4-hour SLA for a
  *potential* sanctions match and *immediate/real-time* for a confirmed true
  match; pending (any type) holds for a maximum of 48 hours before escalation.
- **Test numbering:** the handbook SIT pack is TC-001…TC-012 (the "12 mandatory"
  in the BRD acceptance criteria). The methodology's broader validation pack is
  TC-001…TC-022. They are different sets — keep them labelled by source.
