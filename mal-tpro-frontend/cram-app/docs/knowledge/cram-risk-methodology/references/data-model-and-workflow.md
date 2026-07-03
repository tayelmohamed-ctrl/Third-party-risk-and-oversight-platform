# CRAM Reference — Data Model, Workflow, Events and Audit

Covers the data domains and source systems, the minimum field catalogue,
data-quality treatment, the assessment workflow state machine, event triggers
with SLAs, and audit-record requirements.

## Contents
1. Core data domains and source systems (15.1)
2. Minimum field catalogue (15.2)
3. Data-quality treatment rules (15.3)
4. Workflow states (17.1)
5. Event triggers and SLA matrix (17.2)
6. Audit trail, explainability and records (Section 18)

---

## 1. Core data domains and source systems (15.1)

| Data domain | Source systems | Minimum implementation requirement |
|---|---|---|
| Customer master | Core banking, digital onboarding, CRM | Unique customer ID, segment, lifecycle status, residency, nationality, onboarding date, product holdings, relationship owner |
| Related parties | KYC platform, onboarding forms, corporate registry integrations | UBOs, shareholders, directors, signatories, POAs, guardians, controllers, authorised users, merchant administrators, FI counterparties |
| Screening | Sanctions/TFS, PEP/adverse media, internal watchlists | Screening status, match type, confidence, disposition, list source/version, date, reviewer, escalation outcome |
| Digital identity | eKYC vendor, UAE Pass/EID validation, biometric/liveness engine | ID source, document authenticity, biometric score, liveness result, deepfake/injection signal, exception approval |
| Device/channel | Mobile/web platform, fraud engine, device intelligence, WAF/SIEM | Device fingerprint, IP, GPS, SIM, VPN/TOR/proxy, emulator/root/jailbreak, velocity, ATO indicators |
| Product | Core banking, product catalogue, payment platform, cards, merchant acquiring | Products requested/active, product risk version, features, limits, corridors, API access, control attributes |
| Transactions and behaviour | Payment switch, cards, core banking, merchant acquiring, TM system | Actual turnover, count, velocity, deviation, corridors, counterparties, investigations, STR/SAR, fraud/mule cases |
| Workflow/evidence | Case management, GRC, ticketing, document management, audit log | EDD tasks, approvals, rationale, evidence files, SLA, decision, reviewer, model version, history |

## 2. Minimum field catalogue (15.2)

| Field | Type | Requirement | Applies to | Rule |
|---|---|---|---|---|
| `customer_id` | String | Mandatory | All | Unique customer identifier from core or onboarding platform |
| `assessment_id` | String | Mandatory | All | Unique risk-assessment identifier |
| `model_version_id` | String | Mandatory | All | Active approved model version used for calculation |
| `customer_segment` | Enum | Mandatory | All | NP, LP, MER, FI, EMP or approved extension (EXT) |
| `lifecycle_stage` | Enum | Mandatory | All | New, Existing, Periodic Review, Event Review, Exit Review |
| `relationship_status` | Enum | Mandatory | All | Applicant, Active, Suspended, Restricted, Exited, Rejected |
| `nationality_primary` / `secondary` | ISO country | Mandatory / Conditional | NP | Primary and other nationality where declared/identified |
| `country_of_residence` | ISO country | Mandatory | NP | Legal residence; missing country must not default to Low |
| `source_of_funds_country` | ISO country | Mandatory | All | Primary country of recurring funds |
| `source_of_wealth_country` | ISO country | Conditional | High risk / wealth | Country where wealth was generated |
| `country_of_incorporation` / `operation` | ISO country | Mandatory | LP/MER/FI | Registration and primary operating jurisdiction |
| `ubos_countries` | Array | Mandatory | LP/MER/FI | Nationality/residence of UBOs/controllers |
| `expected_corridors` | Array | Mandatory | All | Expected transaction countries/corridors |
| `product_codes_requested` / `active` | Array | Mandatory | All / Existing | Products requested or currently held |
| `expected_monthly_turnover` | Decimal | Mandatory | All | Expected inflow/outflow or merchant turnover |
| `expected_txn_count` | Integer | Mandatory | All | Expected monthly transaction count |
| `funding_method` | Enum | Mandatory | All | Salary, business revenue, own account, third party, merchant settlement, loan proceeds, other |
| `digital_id_source` | Enum | Mandatory (digital) | NP / signatories | UAE Pass, Emirates ID, approved IDSP, document upload, assisted video, branch |
| `document_auth_result` | Enum | Mandatory (digital) | NP / signatories | Pass, fail, manual review, not applicable |
| `biometric_match_score` | Decimal / Enum | Mandatory (digital) | NP / signatories | Vendor score or pass/fail; threshold stored by model version |
| `liveness_result` | Enum | Mandatory (digital) | NP / signatories | Pass, fail, inconclusive, not performed |
| `device_integrity_status` | Enum | Mandatory (digital) | Digital | Normal, rooted/jailbroken, emulator, tampered, unknown |
| `vpn_tor_proxy_flag` | Boolean | Mandatory (digital) | Digital | True where VPN/TOR/proxy/anonymizer detected |
| `screening_status` | Enum | Mandatory | All | Clear, potential match, true match, false positive, pending |
| `pep_status` | Enum | Mandatory | NP / related parties | None, domestic PEP, foreign PEP, IO PEP, associate/family |
| `adverse_media_status` | Enum | Mandatory | All | None, low, medium, high, true material |
| `sar_str_history` | Enum/Integer | Mandatory (existing) | Existing | Number/status of prior SAR/STR or internal suspicion cases |
| `final_risk_rating` | Enum | Mandatory | All | Low, Medium, High, Prohibited/Reject |

## 3. Data-quality treatment rules (15.3)

| Issue | Treatment | Examples |
|---|---|---|
| Critical KYC identity data missing | Block onboarding / block final assessment | Identity, legal existence, UBO, nationality/residence, license, authorised signatory |
| Country data missing or unmapped | Treat at least **Medium**; High if other risk indicators exist; create remediation task | Country must not default to UAE or Low |
| Occupation/industry unmapped | Treat at least **Medium** pending Compliance mapping; High if high-risk indicators exist | Unmapped self-employed industry or MCC |
| Product unmapped | Treat at least **Medium** and route to product risk owner; prohibit activation of unapproved product | New product, virtual-account feature, API access |
| Activity thresholds missing | Block final approval or apply conservative High to activity until expected activity captured | Do not use zero where data is missing |
| Screening pending | Hold activation until cleared or resolved | Sanctions, PEP, adverse media, related-party screening |
| Manual downgrade requested | Require Compliance approval, rationale, evidence and expiry/review date | System retains mathematical score, original rating, requested rating and approver |

**Cardinal rule:** No field defaults to UAE, Low, "none" or zero unless sourced
and evidenced.

## 4. Workflow states (17.1)

| State | Description | Allowed next states |
|---|---|---|
| `DRAFT` | Assessment started but mandatory data incomplete | `DATA_PENDING`, `SCREENING_PENDING`, `CALCULATION_READY`, `ABANDONED` |
| `DATA_PENDING` | Mandatory fields/evidence missing or failed validation | `CALCULATION_READY`, `REJECTED`, `DRAFT` |
| `SCREENING_PENDING` | Mandatory screening not completed or potential match unresolved | `CALCULATION_READY`, `SANCTIONS_HOLD`, `REJECTED` |
| `CALCULATION_READY` | Inputs validated; risk engine can calculate | `CALCULATED`, `ERROR` |
| `CALCULATED` | Composite rating and override result generated | `EDD_REQUIRED`, `APPROVAL_REQUIRED`, `AUTO_APPROVED`, `REJECTED` |
| `EDD_REQUIRED` | EDD checklist/evidence required | `APPROVAL_REQUIRED`, `REJECTED`, `DATA_PENDING` |
| `APPROVAL_REQUIRED` | Approval required based on rating/floor/override | `APPROVED`, `REJECTED`, `MORE_INFO_REQUIRED` |
| `SANCTIONS_HOLD` | Potential/true sanctions match handling in progress | `REJECTED`, `EXITED`, `APPROVED` only if false positive cleared |
| `RESTRICTED` | Customer active with restricted products/channels/limits | `ACTIVE`, `EXITED`, `PERIODIC_REVIEW` |
| `APPROVED` / `ACTIVE` | Relationship may activate/continue subject to controls | `PERIODIC_REVIEW`, `EVENT_REVIEW`, `RESTRICTED`, `EXITED` |
| `REJECTED` / `EXITED` | Customer not onboarded or relationship exited | Closed state except approved appeal/remediation workflow |

## 5. Event triggers and SLA matrix (17.2)

| Trigger event | Severity | Source | Required action | SLA |
|---|---|---|---|---|
| Sanctions/TFS potential or true match | Critical | Screening system | Hold/freeze/escalate; prohibit if true match | Immediate / same day as sanctions procedure |
| FATF/country library update | High | Compliance library | Batch rescore affected customers/related parties | Within approved change window; critical updates immediate |
| New product, feature or limit increase | Medium/High | Product/core banking | Pre-activation rescore | Before activation |
| Change in nationality/residence/address/SOF | Medium/High | Customer servicing/KYC | Event-driven review and rescore | Within 5 business days or before high-risk transaction |
| UBO/shareholder/director/signatory change | High | Corporate KYC | CDD refresh, screening and rescore | Before acceptance or within policy SLA |
| PEP/adverse media true match | High | Screening/adverse media | EDD task and rescore | Within policy SLA |
| STR/SAR or confirmed suspicion | High | AML investigations | High floor, enhanced monitoring, exit/risk-acceptance review | Immediate after decision |
| Device/account takeover event | High | Fraud/cyber/device monitoring | Restrict high-risk activity; rescore channel/behaviour | Immediate for transaction risk |
| Transaction behaviour threshold breach | Medium/High | TM/payment systems | Create review case; high triggers immediate rescore | Daily or near-real-time based on severity |
| Periodic review due | Scheduled | KYC system | Refresh data and recalculate | As per rating cycle (Low ≤36m, Medium ≤24m, High ≤12m / 6m very-high) |

## 6. Audit trail, explainability and records (Section 18)

| Audit requirement | Implementation detail |
|---|---|
| Point-in-time reproducibility | Store raw input values, transformed values, model version, country/product/library versions, factor/parameter scores, overrides, approvals and evidence references |
| User/system actor tracking | Record actor ID for data entry, system-triggered calculation, review, approval, override, rejection and publication |
| Immutable completed assessment | Completed assessments must not be overwritten. Corrections require a new assessment version linked to the prior assessment |
| Evidence linkage | Each Medium/High factor, override and EDD driver must link to supporting evidence or rationale |
| Override log | All overrides store rule/manual flag, reason code, narrative, approver, timestamp, before/after rating and expiry/review date |
| Data lineage | Each critical field stores source system, extraction timestamp, transformation logic and reconciliation status |
| Explainability output | UI and MI show raw score, mathematical rating, final rating, top drivers, floors/overrides, required controls and next review date |

**Retention:** CRR records must be immutable and retrievable for a minimum of
**5 years**; no delete/update operations on scored records (BRD NFR-003).
