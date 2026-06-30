# CRAM Reference — Model Governance, Validation and Change Control

Covers production validation gates, quantitative calibration requirements,
change-control authority, the model-version/configuration baseline, and ongoing
MI/KRIs.

## Contents
1. Production validation gates (19.1)
2. Quantitative calibration requirements (19.2)
3. Change control (19.3)
4. Model version control and configuration baseline (19.4)
5. MI, KRIs and ongoing monitoring (Section 20)

---

## 1. Production validation gates (19.1)

Each gate has exit criteria and an approver. Go-live requires passing all gates.

| Gate | Objective | Minimum exit criteria | Approver |
|---|---|---|---|
| **Gate 0 — Model freeze** | Confirm one approved methodology and parameter set | Methodology and parameter set approved and frozen; single active configuration confirmed; `model_version_id` issued | Model Governance / FCC / MLRO |
| **Gate 1 — Data readiness** | Confirm source-system mapping and data quality | Source-to-target matrix complete; DQ test passed; lineage and exception register approved | Data Governance / Technology / FCC |
| **Gate 2 — Vendor readiness** | Confirm vendor outputs fit for intended use | Vendor due diligence, performance metrics, integration mapping and monitoring cadence approved | Vendor Governance / Fraud / FCC |
| **Gate 3 — SIT exit** | Confirm rule engine, APIs, batch jobs, audit and security work | 100% mandatory scripts executed; zero open Critical/High defects | Technology QA / Compliance Technology |
| **Gate 4 — UAT exit** | Confirm business users can operate the model end-to-end | Business scenarios passed; user acceptance signed; training complete | Operations / FCC / Fraud / Sanctions |
| **Gate 5 — Calibration, parallel run and back-testing** | Confirm outcome reasonableness and operational impact | Calibration, movement matrix, false-negative review and operational impact approved | Model Validation / FCC / Operations |
| **Gate 6 — Production approval** | Approve go-live | All Critical/High findings closed; Medium residuals accepted; monitoring plan active | Senior Governance Forum |

## 2. Quantitative calibration requirements (19.2)

- Use a representative **12–24 month** population covering segments, products,
  geographies, channels and lifecycle stages.
- Produce: rating distribution, threshold sensitivity, outcome-rate-by-band,
  override impact, false-negative analysis, stability/drift metrics, and
  segment/product/geography concentration analysis.
- Demonstrate **directional risk sensitivity**: High-rated and overridden
  customers should show higher adverse-outcome incidence than Medium and Low
  populations (subject to portfolio-composition explanation).
- Document any threshold/weight tuning with before/after movement, risk
  rationale, operational impact and governance approval.
- Link calibration approval to the frozen `model_version_id`.

## 3. Change control (19.3)

| Change type | Examples | Approval | Testing requirement |
|---|---|---|---|
| Minor configuration | Typo, display label, non-risk workflow text | Compliance Technology + Owner | Regression smoke test |
| Reference library update | Country, product, occupation, industry or MCC score update | Financial Crime Compliance | Impact analysis and affected-customer rescore plan |
| Threshold / weight change | Rating bands, factor weights or parameter weights | Model Governance Committee / Risk Committee | SIT, UAT, parallel run, validation sign-off |
| New product/channel | New payment product, API feature, wallet, merchant channel | Product Governance + Compliance + Risk | Product financial-crime risk assessment and scenario testing |
| Vendor/model change | Digital ID vendor, screening algorithm, device risk model | Vendor Governance + Compliance + Technology Risk | Assurance review, performance test and fallback plan |
| Regulatory change | CBUAE notice, sanctions requirement, FATF update | Compliance + Legal + Risk Committee as required | Gap assessment and implementation plan |

## 4. Model version control and configuration baseline (19.4)

Canonical model version: **`CRAM-CBUAE-2026-05-FREEZE-01`**. This methodology,
the End-to-End Customer Lifecycle and Onboarding Operating Model, and the
dataset workbook must all reference this exact identifier. Point-in-time
reproducibility requires the model version, the reference-library versions and
the effective date to resolve to this frozen configuration.

| Configuration area | Baseline rule | Owner / gate |
|---|---|---|
| Model version identity | `CRAM-CBUAE-2026-05-FREEZE-01` is the single canonical `model_version_id`, applied consistently in the document control table, the closing control statement, the page footer, the operating model and the workbook data dictionary | Model Owner / Gate 0 |
| Factor and parameter structure | Scoring is two-layer: parameters (Section 7) roll up into the six composite factors, which combine at the segment/lifecycle weights (Section 6.1). The workbook factor/parameter map records every parameter-to-factor assignment. All weight sets sum to 100% | Model Owner / Gate 0 |
| FI systems-and-controls counting | The FI systems-and-controls factor (Section 7.3.2) enters the composite **once** at its Section 6.1 factor weight. FI control parameters roll up into this factor and are not added to the composite independently | Model Owner / Gate 0 |
| Geography scale | Country risk is expressed through the separate Section 8.1 pillars (sanctions/TFS exposure, FATF status and the remaining pillars), each carrying a single coherent value domain. The composite country risk level is derived from the weighted pillars | Model Owner / Gate 0 |
| Reference libraries | Country, occupation/industry/MCC and product reference libraries are maintained as controlled, versioned, executable data with maker-checker and effective-date control; every scoring lookup resolves against a named, versioned table | Data Governance / Gate 1 |
| Vendor-dependent thresholds | Identity-proofing, document-authenticity, biometric/liveness, device-integrity and screening-match thresholds are model-version-bound parameters confirmed under vendor validation; conservative floors apply to weak/inconclusive outcomes until thresholds are approved | Vendor Governance / Gate 2 |
| Calibration and back-testing | Outcome reasonableness, rating distribution, threshold sensitivity, override impact, false-negative analysis and stability/drift are confirmed on a representative population and tied to the frozen `model_version_id` before production approval | Model Validation / Gate 5 |

**Non-dilution governs every item above:** no configuration may weaken a hard
stop, mandatory floor or override; strong controls may never reduce inherent
risk below the level implied by inherent risk drivers. Factor/parameter weight
sets are fixed by Sections 6 and 7 and must reconcile to their stated totals.

## 5. MI, KRIs and ongoing monitoring (Section 20)

| KRI / MI | Frequency | Indicator | Owner |
|---|---|---|---|
| Portfolio distribution by risk rating | Monthly | High-risk concentration above appetite or sudden rating shifts | Compliance / Risk Committee |
| High-risk onboarding approval SLA | Monthly | EDD/approval overdue beyond SLA | Compliance Operations |
| Override volume and direction | Monthly | High manual override volume, downgrades, or repeated reason codes | Model Governance |
| Digital ID exception rate | Monthly | Exception rate above tolerance, vendor drift, or failed-liveness increase | Digital Onboarding / Fraud / FCC |
| Screening potential/true match trends | Monthly | Increase in true matches, unresolved potential matches, or list-update impact | Sanctions Compliance |
| Geography exposure by country/corridor | Monthly | Growth in high-risk country exposure or new corridor concentrations | FCC / Product |
| Product risk exposure | Monthly | Increase in high-risk product customers, limits or volume | Product / FCC |
| TM alerts and STR/SAR by risk rating | Monthly | Low-rated customers producing disproportionate suspicious activity | AML Investigations / Model Validation |
| Data-quality exceptions | Monthly | Mandatory field gaps, stale CDD, missing related parties, unresolved mappings | Data Governance |
| Model performance / back-testing | Quarterly | Rating not predictive of alerts/STRs, or high false-negative indicators | Model Validation |

## 6. Final control statement

This methodology is the single authoritative CRAM for `CRAM-CBUAE-2026-05-FREEZE-01`.
No alternative threshold set, FI factor taxonomy, unweighted FI parameter
library, undefined Medium floor, uncontrolled control-effectiveness reduction or
obsolete boundary test may be used in production configuration, validation
evidence, user training, MI reporting or governance packs. Any change to
thresholds, factor taxonomy, weights, floors, overrides or product/control
treatment requires formal change control, impact assessment, validation and
governance approval before deployment.
