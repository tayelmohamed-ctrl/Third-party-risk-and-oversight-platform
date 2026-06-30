# CRAM Reference — Overrides, Risk Floors and Prohibitions

Overrides are **deterministic, auditable and separate from the weighted scoring
engine**. The system stores every applicable override but applies the **most
restrictive** final outcome. Evaluate hard prohibitions first (before normal
approval routing), then High floors, then Medium floors. **Manual downgrades
cannot override hard prohibitions or mandatory floors.**

Priority order: **Highest** (hard prohibitions) → **High** floors → **Medium**
floors. A Low/Medium mathematical score can never suppress a higher override.

## Contents
1. Override hierarchy — OVR-001 to OVR-020 (full table)
2. Hard-stop / non-configurability rules
3. Manual override controls
4. EDD evidence matrix (Section 14.1)

---

## 1. Override hierarchy — OVR-001 to OVR-020

| Rule ID | Trigger | Outcome | Priority | Required evidence / treatment |
|---|---|---|---|---|
| **OVR-001** | Confirmed UN/UAE TFS or sanctions true match, legally required freeze, or prohibited sanctions exposure | **Hard stop / Freeze / Report** | Highest | Sanctions case record, disposition, freeze/escalation/reporting evidence |
| **OVR-002** | Prohibited customer, activity, product, relationship type or jurisdiction under risk appetite or law | **Reject / Exit** | Highest | Risk appetite reference, rejection/exit approval |
| **OVR-003** | Synthetic/fictitious identity, forged/tampered ID, confirmed onboarding fraud | **Reject / Internal watchlist / Reporting review** | Highest | Fraud evidence, IDSP result, investigation outcome |
| **OVR-004** | Unable/refused to identify or verify UBO, controller or authorised signatory where required | **Reject or High pending remediation** | High | UBO evidence gap, remediation record, Compliance decision |
| **OVR-005** | Shell bank, or FI permitting shell-bank use | **Reject / Exit** | Highest | FI due diligence, respondent controls assessment |
| **OVR-006** | Unlicensed regulated activity where a license is required | **Reject / Prohibited** | Highest | License review and legal/compliance assessment |
| **OVR-007** | Anonymous, bearer-like or unverified product feature | **Prohibited** | Highest | Product risk assessment and block evidence |
| **OVR-008** | Foreign PEP, IO PEP, high-risk PEP nexus, or close associate/family of material PEP | **High** | High | PEP screening, SoW/SoF, senior approval |
| **OVR-009** | Material adverse media involving ML/TF/PF, sanctions, fraud, corruption or serious predicate offence | **High or Reject** | High | Adverse media review and mitigation rationale |
| **OVR-010** | STR/SAR filed, confirmed suspicion, or suspicion cannot be mitigated | **High** | High | Restricted investigation record; tipping-off controls |
| **OVR-011** | High-risk country exposure not prohibited (high-risk residence/operation/SOF/corridor) | **High** | High | Country-risk library, EDD rationale and approval |
| **OVR-012** | High-risk business, product or merchant activity within appetite | **High** | High | Business/product risk assessment and EDD |
| **OVR-013** | Failed or unresolved digital identity controls: liveness fail, biometric mismatch, deepfake/injection, device farm | **High or Reject** | High | ID vendor result, fraud/compliance review |
| **OVR-014** | Correspondent, nested, downstream or payable-through FI exposure within appetite | **High** | High | FI EDD, downstream controls, senior approval |
| **OVR-015** | Non-resident with strong evidence and no other High indicator | **Medium floor** | Medium | Residency evidence, purpose, expected activity |
| **OVR-016** | Moderate adverse media, or domestic PEP with mitigants and no High indicator | **Medium floor** | Medium | Disposition rationale and approval |
| **OVR-017** | Unassessed country, medium-risk country, or multiple medium geography indicators | **Medium floor** | Medium | Country risk task and remediation owner |
| **OVR-018** | Document/manual digital verification resolved but not strong assurance | **Medium floor** | Medium | Manual review evidence and approval |
| **OVR-019** | New entity, limited operating history, or newly launched merchant with plausible business model | **Medium floor** | Medium | Operating evidence and follow-up review |
| **OVR-020** | Explained VPN/proxy, moderate device anomaly, or moderate transaction deviation | **Medium floor** | Medium | Digital/fraud review and monitoring adjustment |

### Grouping at a glance
- **Hard prohibitions / hard stops (block activation, non-bypassable):** OVR-001 → OVR-007.
- **High floors:** OVR-008 → OVR-014.
- **Medium floors:** OVR-015 → OVR-020.

## 2. Hard-stop / non-configurability rules

- **OVR-001 to OVR-007 are hard-coded as non-configurable** in the architecture.
  Compliance alone cannot modify them even with maker-checker. Their
  `active_flag` is locked; any API call to change them must be **rejected with an
  error and logged** (BRD FR-017).
- OVR-001 to OVR-007 **block activation and cannot be bypassed** (BRD FR-005).
- Confirmed sanctions/TFS true match (OVR-001) is evaluated **before** normal
  approval routing and triggers freeze/escalation/reporting per sanctions
  procedure (immediate / same-day SLA).

## 3. Manual override controls (Section 13.2)

- **Manual uplifts** may be applied by authorised Compliance users where
  emerging typology, weak evidence, unusual complexity or unresolved concern
  exists.
- **Manual downgrades** require Head of Compliance/MLRO or delegated senior
  Compliance approval, documented rationale, expiry/review date and evidence.
- Manual downgrades **cannot** reduce a prohibited outcome, hard stop or
  mandatory High/Medium floor below the required floor.
- Every manual override must store: **before/after rating, reason code,
  narrative, approver, timestamp, evidence reference, next review date.** The
  system also retains the mathematical score, original rating and requested
  rating.

## 4. EDD evidence matrix (Section 14.1)

When a High outcome or EDD driver applies, capture the minimum evidence and
populate the system task fields below.

| Risk driver | Minimum EDD evidence | System task fields |
|---|---|---|
| High geography | Purpose of relationship, reason for country nexus, SOF/SOW evidence, expected corridors, adverse media review | `EDD_GEO_RATIONALE`, `SOF_EVIDENCE`, `SOW_EVIDENCE`, `CORRIDOR_JUSTIFICATION` |
| High product / service | Product purpose, limit rationale, beneficiary/counterparty profile, product control confirmation | `PRODUCT_PURPOSE`, `LIMIT_APPROVAL`, `PRODUCT_CONTROL_CHECK` |
| PEP | PEP role, public function, country, SoW, expected activity, senior approval | `PEP_ROLE`, `PEP_SOW`, `SENIOR_APPROVAL` |
| Complex ownership | Ownership chart, UBO verification, legal purpose, source of wealth/funds | `OWNERSHIP_CHART`, `UBO_EVIDENCE`, `CONTROL_RATIONALE` |
| Digital ID exception | Exception reason, compensating verification, fraud review outcome, approval | `DIGITAL_EXCEPTION_REASON`, `COMPENSATING_CONTROL`, `FRAUD_REVIEW` |
| Merchant high risk | Website/app review, MCC validation, refund/chargeback controls, settlement review | `MERCHANT_DD`, `MCC_VALIDATION`, `SETTLEMENT_ACCOUNT_CHECK` |
| FI / regulated partner | License/regulator verification, AML questionnaire, sanctions controls, downstream exposure, audit/certification | `FI_DD_PACK`, `AML_QA`, `DOWNSTREAM_EXPOSURE`, `SANCTIONS_CONTROL_REVIEW` |
