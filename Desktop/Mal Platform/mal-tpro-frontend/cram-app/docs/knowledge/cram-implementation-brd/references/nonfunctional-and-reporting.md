# CRAM BRD Reference — Non-Functional and Reporting Requirements

## 1. Non-Functional Requirements (NFR-001 … NFR-008)

All **MUST HAVE**.

| ID | Category | Requirement |
|---|---|---|
| **NFR-001** | Performance | CRR scoring (excluding screening) completes within **2 seconds for 95%** of requests. |
| **NFR-002** | Availability | CRR scoring engine available **99.9% uptime** (excluding planned maintenance). |
| **NFR-003** | Auditability | All CRR records immutable and retrievable for a minimum of **5 years**. No delete or update operations permitted on scored records. |
| **NFR-004** | Security | Scoring-API access requires an authenticated service account. Manual override requires Compliance role. Config changes require Compliance Maker + Checker roles. All access logged. |
| **NFR-005** | Scalability | Handle **10,000 concurrent assessments** without degradation (for batch periodic-review runs). |
| **NFR-006** | Data residency | All CRR data stored within **UAE jurisdiction** per CBUAE data-localisation requirements. |
| **NFR-007** | Recoverability | Achieve **RPO < 1 hour** and **RTO < 4 hours** on system failure. |
| **NFR-008** | Encryption | All CRR data encrypted at rest (**AES-256**) and in transit (**TLS 1.2+**). |

## 2. Reporting and Dashboard Requirements (RPT-001 … RPT-008)

| ID | Report / Dashboard | Content | Frequency |
|---|---|---|---|
| **RPT-001** | CRR Rating Distribution | Count and % of customers by final rating (Low/Medium/High/Prohibited) by segment | Daily (dashboard) + Monthly (Compliance report) |
| **RPT-002** | Override Frequency Report | Count of each OVR rule triggered; % of total; downgrade cases with approver | Monthly |
| **RPT-003** | Periodic Review Status | % reviewed on time by rating band; overdue count; average days overdue | Weekly (dashboard) + Monthly (Compliance report) |
| **RPT-004** | Event-Driven Rescore Log | All event-driven rescores: trigger event, prior rating, new rating, delta | On demand; Monthly summary |
| **RPT-005** | High-Risk Customer Register | All High-rated customers: rating date, override flags, EDD completion status, next review | Weekly refresh |
| **RPT-006** | Model Performance Report | Rating distribution trend; SAR/STR correlation with High rating; override downgrade rate | Quarterly (for Model Governance Committee) |
| **RPT-007** | Configuration Change Log | All config changes: table, field, before/after value, maker, checker, timestamp | On demand |
| **RPT-008** | CBUAE Examination Pack | Customer sample export with full CRR inputs, scores, overrides and evidence references | On demand (for examination) |

## Notes for implementation
- RPT-008 must be generatable for a **25-customer sample within 2 hours** (acceptance criterion).
- RPT-002 / RPT-007 draw on the override log and config-change log defined in the methodology audit requirements (`cram-risk-methodology` → `data-model-and-workflow.md` §6 and `governance-and-validation.md`).
- RPT-003 depends on the periodic-review scheduler producing rating-based due dates (Low ≤36m, Medium ≤24m, High ≤12m / 6m very-high).
