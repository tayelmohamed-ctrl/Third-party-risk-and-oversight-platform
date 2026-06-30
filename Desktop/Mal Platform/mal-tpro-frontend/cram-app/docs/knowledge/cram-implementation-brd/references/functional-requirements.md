# CRAM BRD Reference — Functional Requirements (FR-001 … FR-020)

All functional requirements are **MUST HAVE**. They fall into three groups:
CRR scoring engine, screening integration, and configuration management. Where a
requirement references a methodology section, resolve the detail from the
`cram-risk-methodology` skill.

## 1. CRR Scoring Engine (FR-001 … FR-010)

| ID | Requirement | Detail |
|---|---|---|
| **FR-001** | Segment and lifecycle selection | Support six segments (NP/LP/MER/FI/EMP/EXT) and two lifecycle stages (New Onboarding / Existing Review). Segment determines factor set and weights. |
| **FR-002** | Parameter scoring | Present all parameters for the selected segment/lifecycle as Low/Medium/High dropdowns. Mandatory parameters must be completed before scoring can proceed. |
| **FR-003** | Composite score calculation | Calculate composite score per Section 2 of the Technical Handbook (the exact formula, with within-factor weight re-normalisation, is in the `cram-technical-implementation` skill), storing to 4 decimal places. |
| **FR-004** | Mathematical rating mapping | Score ≤1.5 = Low; 1.5001–2.15 = Medium; >2.15 = High. No rounding of the composite score before band mapping. |
| **FR-005** | Override engine | Evaluate all 20 OVR rules after scoring and apply the most restrictive floor. OVR-001 to OVR-007 must block activation and cannot be bypassed. |
| **FR-006** | Non-dilution enforcement | A mathematical Low score must not reduce a mandatory High or Medium floor. Final rating = most restrictive. |
| **FR-007** | Missing data block | Missing mandatory parameters must return BLOCKED status and list missing fields. No default to Low. |
| **FR-008** | CDD outcome mapping | Map final rating to CDD treatment, approval authority, review frequency and monitoring intensity per Section 16 of the methodology. |
| **FR-009** | Approval workflow | High-rating assessments must route to MLRO/Head of Compliance for approval before activation. The system must enforce approval before the account is activated. |
| **FR-010** | Manual override | Compliance users may apply manual uplifts. Manual downgrades require MLRO approval. Capture rationale, approver, expiry date. |

## 2. Screening Integration (FR-011 … FR-015)

| ID | Requirement | Detail |
|---|---|---|
| **FR-011** | Pre-onboarding screening | Sanctions/TFS, PEP, adverse media and watchlist screening must run **before** CRR scoring. True Match = block activation. |
| **FR-012** | Ongoing screening | Re-screen customers on list updates and return event hooks for near-matches. |
| **FR-013** | Screening result storage | Store all screening results immutably with type, result, disposer, disposition rationale and timestamp. |
| **FR-014** | Pending hold enforcement | A pending screening result must block activation until resolved. Maximum hold: **48 hours** before Compliance escalation. |
| **FR-015** | False positive documentation | Capture false-positive disposition with disposer, rationale and timestamp. |

## 3. Configuration Management (FR-016 … FR-020)

| ID | Requirement | Detail |
|---|---|---|
| **FR-016** | Maker-checker for config changes | All configuration updates (weights, country library, product baseline, override active-status) require **two different Compliance users** (Maker + Checker). The system must enforce this. |
| **FR-017** | Hard Stop lock | OVR-001 to OVR-007 `active_flag` must be locked. Any API call to change these must be rejected with an error and logged. |
| **FR-018** | `model_version_id` increment | Every approved configuration change must generate a new `model_version_id` and store the prior version with an `effective_to` timestamp. |
| **FR-019** | Weight validation | Sum of parameter weights per factor must equal 1.0. Sum of factor weights per segment-lifecycle must equal 1.0. The system must validate and reject non-compliant updates. |
| **FR-020** | Config version in audit | Every CRR scoring record must store the `model_version_id` active at the time of scoring. |

## Cross-references to the methodology
- FR-003 composite calculation → methodology §4.2 (formula) and §4.3 (precision); exact arithmetic and pseudocode in `cram-technical-implementation` §2–3.
- FR-004 band mapping → methodology §4.1 (rating bands; unrounded raw score).
- FR-005 / FR-006 overrides and non-dilution → methodology §13 and `overrides-and-floors.md`.
- FR-007 missing-data block → methodology §15.3 (data-quality treatment).
- FR-008 outcome mapping → methodology §14 (CDD/EDD/approval/review/monitoring).
- FR-016 / FR-018 / FR-019 governed config → methodology §19.3 / §19.4.
