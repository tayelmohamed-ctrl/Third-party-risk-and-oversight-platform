---
name: cram-risk-methodology
description: >-
  Authoritative Customer Risk Assessment Methodology (CRAM) for a CBUAE-aligned
  digital bank — the model that scores, rates, overrides and routes customer
  financial-crime risk. Use this skill WHENEVER work touches: customer risk
  rating (CRR / CRA), inherent ML/TF/PF/sanctions risk scoring, the 1.0–3.0
  score scale or the Low/Medium/High rating bands, factor or parameter weights,
  risk floors, hard stops, non-dilution, the OVR-001…OVR-020 override rules,
  CDD/EDD treatment, approval authority, review frequency, monitoring intensity,
  PEP/sanctions/adverse-media screening outcomes, country/geography risk,
  product risk baselines, digital onboarding / channel assurance scoring,
  expected-vs-actual behaviour risk, event-driven rescore, the CRAM data model
  and audit record, or model governance, calibration and validation gates.
  Trigger even when the user only says "score this customer", "what rating",
  "does this trigger a floor", "is this a hard stop", "what CDD applies",
  "when is the review due", "explain the methodology", or names a segment
  (NP / LP / MER / FI / EMP / EXT). Model version: CRAM-CBUAE-2026-05-FREEZE-01.
---

# CRAM — Customer Risk Assessment Methodology

This skill encodes the **single authoritative Customer Risk Assessment
Methodology** for model version **`CRAM-CBUAE-2026-05-FREEZE-01`**. It lets
Claude calculate, explain, validate and reason about customer financial-crime
risk ratings exactly as the methodology specifies — scoring, overrides,
outcomes, data, and governance.

Two companion skills complete the set: **`cram-implementation-brd`** (the BRD —
*what* technology must build, test and accept) and **`cram-technical-implementation`**
(the developer handbook — *how* to build it: formula, schema, APIs, pseudocode).
Read this skill for *how the model actually works*.

> **Golden rule — non-dilution.** Hard stops and mandatory floors override the
> mathematical score. A Low or Medium composite score must **never** suppress a
> prohibited or High-risk condition. Strong controls must **never** reduce
> inherent risk below the level implied by inherent risk drivers. The final
> rating is always the **most restrictive** applicable outcome.

## When to read the reference files

The SKILL.md below carries the framework you need for most questions (scale,
bands, weights, calculation sequence, override priority, outcome mapping). Open
a reference file when the task needs the detailed tables:

| Need | Read |
|------|------|
| Score a specific parameter / look up a factor's parameter library (NP, LP/MER, FI, geography, product, digital onboarding, channel, behaviour, screening) | `references/parameter-libraries.md` |
| Apply or check an override / floor / prohibition; full OVR-001…OVR-020; manual override rules; EDD evidence matrix | `references/overrides-and-floors.md` |
| Field names, data domains, data-quality treatment, workflow states, event triggers/SLAs, audit-record contents | `references/data-model-and-workflow.md` |
| Validation gates, calibration, change control, model-version/config baseline, MI/KRIs | `references/governance-and-validation.md` |

## 1. Core design principles (always apply)

- **Risk-based and evidence-led** — outcomes driven by documented indicators,
  controlled libraries and source data. No generic/unsupported assumptions.
- **Non-dilution** — hard stops and mandatory floors override the math.
- **Inherent risk first** — the primary rating is inherent risk. Residual
  controls are for MI only; they never reduce mandatory CDD/EDD or floors.
- **Point-in-time reproducibility** — every assessment must be reconstructable
  from the customer data, libraries, model version, rule version and approvals
  effective at the time of scoring.
- **No default-to-Low** — missing/unmapped/inconsistent/pending critical data
  blocks completion or is treated conservatively. No field defaults to UAE,
  Low, "none" or zero unless sourced and evidenced.
- **Configurable governance** — weights, thresholds, rules, libraries, reason
  codes are governed parameters, not hard-coded (except security-required code).
- **Lifecycle sensitivity** — New customers weight profile/product/geography/
  digital assurance more; Existing customers weight actual behaviour more.
- **Auditability & explainability** — users must see factor scores, parameter
  scores, top drivers, overrides, workflow status, evidence and next review.

## 2. Scoring framework

### 2.1 Scale and rating bands (unrounded raw score)

| Raw score band | Mathematical rating | Minimum treatment |
|---|---|---|
| 1.0000 – 1.5000 | **Low** | Standard CDD; SDD only where lawful and explicitly evidenced |
| 1.5001 – 2.1500 | **Medium** | Standard CDD + targeted controls and monitoring adjustments |
| 2.1501 – 3.0000 | **High** | EDD, enhanced monitoring, senior/delegated approval, shorter review |
| Override only | **Prohibited / Reject / Freeze / Exit** | No relationship or restricted legal/sanctions handling. Cannot be downgraded by a business user or by the math. |

Band boundaries are decided on the **unrounded** raw score. A Medium floor can
force Medium even where the raw score is Low; High also applies where a
mandatory floor or override fires.

### 2.2 Composite score formula (authoritative arithmetic)

```
composite_score =
    Σ over factors {
        [ Σ over parameters in factor ( parameter_score × parameter_weight )
          / Σ ( parameter_weights present in factor )
        ] × factor_weight
    }
```

- `parameter_score ∈ {1=Low, 2=Medium, 3=High}`; `composite_score ∈ [1.0000, 3.0000]`, stored to 4 decimals.
- The inner term divides by the **sum of parameter weights actually present** in
  the factor — this re-normalises when an *optional* parameter is omitted, keeping
  the factor score on the 1–3 scale. *Mandatory* parameters are never omitted —
  a missing mandatory parameter returns **BLOCKED** (never defaults to Low).
- Engineering detail, pseudocode and the API contract live in the
  **`cram-technical-implementation`** skill (Section 2). QA tolerance vs manual
  calculation is **0.0001**.

### 2.3 Calculation sequence (10 steps)

1. Identify customer **segment**, **lifecycle stage** and material related-party roles.
2. Load the active approved `model_version_id`, factor weights, parameter weights, thresholds, libraries and override rules.
3. Validate mandatory data completeness and screening prerequisites. *(Blockers → `DATA_PENDING` / `REJECTED`.)*
4. Run/retrieve screening for the customer **and material related parties**. *(Confirmed sanctions/TFS true match → hard stop OVR-001; pending → `SCREENING_PENDING` / `SANCTIONS_HOLD`.)*
5. Score parameters using controlled libraries and deterministic rules. *(Every non-Low parameter needs a reason code + source field.)*
6. Calculate **factor scores** (weighted average, maximum-risk rule, or approved range logic, as configured). Factor scores stay within 1.0000–3.0000.
7. Calculate **raw composite score = Σ(factor_score × factor_weight)** and map to Low/Medium/High using the bands above.
8. Evaluate **overrides and floors in priority order**; store all triggered rules; apply the **most restrictive** outcome.
9. Derive **CDD/EDD, approval route, monitoring profile and next review date**. (High-risk approval before activation unless approved restricted handling.)
10. Persist the immutable assessment snapshot (inputs, scores, overrides, approvals, evidence, versions) and publish the approved rating downstream.

### 2.4 Rounding and precision

- Store raw composite to **≥4 decimals** (6 preferred for config validation).
- **Threshold decisions use the unrounded raw score.** Display rounding never drives the rating.
- Store weights as **decimals** (e.g. 16.666667% → `0.166667`), never display-only percentages.
- Weight-total tolerance is **±0.0001** per factor set; any active set outside tolerance **fails deployment**.
- **No intermediate contribution is rounded before summation.**

## 3. Segments and relationship hierarchy

| Code | Segment | Roles captured (examples) |
|---|---|---|
| **NP** | Natural Person | customer, joint holder, minor, guardian, attorney, authorised user, cardholder, sole-establishment owner |
| **LP** | Legal Person / SME | company, partnership, trust, foundation, SPV, NPO/charity, UBO, shareholder, director, manager, signatory, POA, controller, parent |
| **MER** | Merchant / Platform Seller | merchant entity + beneficial owner, administrator, website/app owner, settlement account, payment facilitator/platform (uses LP scoring **plus** merchant rules) |
| **FI** | Financial Institution / Regulated Partner | respondent/correspondent, PSP, exchange house, NBFI, VASP where permitted, fintech partner, payment facilitator, downstream/nested exposure (uses the **FI six-factor taxonomy** incl. systems-and-controls) |
| **EMP** | Employee / High-Risk Insider | staff customer, staff-related business, privileged user with customer exposure. **Overlay only** — a conflict/insider risk indicator that **does not reduce or replace** customer CRR scoring. |
| **EXT** | Approved extension | any additional segment approved under governance. Treated per its approved factor/parameter set. |

Apply the **highest material related-party risk** where a party can transact,
control or benefit. Unverified UBO or no lawful purpose is a hard stop or High
pending remediation.

## 4. Factor weights by segment and lifecycle (active production set)

Two layers: parameters roll up into the six composite **factors**, which combine
at the **segment × lifecycle** weights below. Each column sums to 100%.

| Factor | NP New | NP Exist. | LP/MER New | LP/MER Exist. | FI New | FI Exist. |
|---|---|---|---|---|---|---|
| Customer profile risk | 25% | 20% | 25% | 20% | 20% | 15% |
| Geography / sanctions nexus risk | 20% | 15% | 20% | 15% | 20% | 20% |
| Systems and controls | N/A | N/A | N/A | N/A | 15% | 15% |
| Product / service / correspondent risk | 20% | 15% | 20% | 15% | 20% | 20% |
| Digital onboarding / channel / API assurance | 25% | 20% | 20% | 15% | 10% | 10% |
| Expected activity / transaction behaviour / funding | 10% | 30% | 15% | 35% | 15% | 20% |
| **Total** | **100%** | **100%** | **100%** | **100%** | **100%** | **100%** |

- **Lifecycle shift:** New onboarding leans on profile/geography/product/digital
  assurance; Existing review leans on **actual behaviour**.
- **Systems-and-controls** is an **FI-only** factor; it enters the composite
  **once** at its factor weight (its parameters roll up into it, not separately).
- **Geography** is derived from the Section 8.1 pillars (see parameter library).
- Legacy migrated customers still use the active set above. If a geography
  residence/nationality split is retained for reporting, store residence as
  `0.166667` and nationality as `0.083333` within the `0.250000` geography
  allocation; the deployment gate validates the **full-factor total**, not
  display strings.

## 5. Overrides, floors and prohibitions (summary)

Overrides are deterministic, auditable and **separate from the weighted engine**.
The system stores all applicable overrides but applies the **most restrictive**
outcome. Evaluate in priority order:

1. **Hard prohibitions (Highest)** — OVR-001…OVR-007 (plus OVR-002/005/006 reject/exit). These **block activation and cannot be bypassed**, including by maker-checker — they are non-configurable in the architecture.
2. **High floors** — OVR-008…OVR-014 (foreign/IO PEP, material adverse media, STR/SAR, high-risk country, high-risk product/merchant, failed digital identity, correspondent/nested FI).
3. **Medium floors** — OVR-015…OVR-020 (non-resident with strong evidence, moderate adverse media/domestic PEP, unassessed/medium country, document-only verification, new entity, explained VPN/anomaly).

Manual **uplifts** are allowed for authorised Compliance users. Manual
**downgrades** require Head of Compliance/MLRO (or delegated senior) approval,
rationale, evidence and expiry/review date, and **cannot go below a hard stop or
mandatory floor**. The system retains the mathematical score, original rating,
requested rating and approver.

➡️ For the full OVR-001…OVR-020 table, manual-override controls and the EDD
evidence matrix, read **`references/overrides-and-floors.md`**.

## 6. Outcome mapping — CDD, approval, review, monitoring

| Final outcome | CDD / EDD | Approval authority | Review frequency (max) | Monitoring |
|---|---|---|---|---|
| **Low** | Standard CDD; SDD only where lawful, supported, evidenced and uncontradicted | Automated/Operations or business delegated where policy permits | **36 months** (earlier on trigger) | Standard + baseline digital controls |
| **Medium** | Standard CDD + targeted info based on drivers | Operations/Compliance depending on driver | **24 months** (earlier on event/DQ exception/activity deviation) | Moderate + selected enhanced scenarios |
| **High** | EDD, SoF/SoW where relevant, adverse-media review, enhanced sanctions/PEP checks, documented risk acceptance | Head of Compliance/MLRO or delegated senior; senior mgmt for PEP/correspondent where required | **12 months**; **6 months** for very high-risk PEP / digital-fraud / correspondent | Enhanced, lower thresholds, periodic adverse media, restrictions where required |
| **Prohibited / Reject / Freeze / Exit** | No relationship or restricted legal/sanctions handling | Compliance/MLRO/Legal escalation + governance | N/A | Block, freeze, reject, exit and report as required |

## 7. What flows in vs out of this methodology

- **In scope:** sanctions/TFS screening is a **mandatory pre-activation control**
  and a determinant of hard stops and floors. Screening (sanctions, PEP, adverse
  media, internal watchlist) runs **before activation** and on list updates.
- **Out of scope (consumed as inputs only):** FATCA/CRS tax classification (done
  in the Onboarding Operating Model; feeds in only as a profile/geography input —
  this methodology does not determine tax reportability); transaction-monitoring
  rule-building; SAR/STR filing; anti-fraud scoring. The CRR rating is **published
  to** those systems; they are not built here.

## 8. Key consistency rules (do not break)

- Use only the frozen threshold set, factor taxonomy and weights above. No
  alternative FI taxonomy, unweighted FI parameter set, undefined Medium floor,
  or obsolete boundary test may be used.
- Always store `model_version_id` on every scoring record (Day 1 onward).
- The canonical model version is **`CRAM-CBUAE-2026-05-FREEZE-01`**; this
  methodology, the Onboarding Operating Model and the dataset workbook must all
  reference this exact identifier. (The BRD references the same model family as
  `CRAM-CBUAE-2026-June`; treat the FREEZE-01 string as the canonical
  `model_version_id`.)
- Any change to thresholds, taxonomy, weights, floors, overrides or
  product/control treatment requires formal change control, impact assessment,
  validation and governance approval **before** deployment.
