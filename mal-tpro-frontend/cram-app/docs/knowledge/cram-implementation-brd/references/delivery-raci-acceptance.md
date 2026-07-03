# CRAM BRD Reference — Delivery, RACI, Acceptance and Test Pack

## 1. Implementation plan and milestones

| Phase | Deliverable | Owner | Target |
|---|---|---|---|
| 1 | BRD approval and technical design sign-off | Compliance + Technology | Week 1–2 |
| 2 | Configuration service and database schema build | Technology | Week 2–5 |
| 3 | CRR scoring engine and override engine development | Technology | Week 3–8 |
| 4 | Screening integration (sanctions, PEP, adverse media, watchlist) | Technology + Vendors | Week 4–8 |
| 5 | Audit store and immutable record implementation | Technology | Week 5–8 |
| 6 | Periodic-review scheduler and event-hook integration | Technology | Week 6–10 |
| 7 | Compliance dashboard and reporting | Technology + Compliance | Week 8–11 |
| 8 | SIT (System Integration Testing — 12 mandatory TCs) | Technology + QA | Week 10–12 |
| 9 | UAT (User Acceptance Testing — Compliance + MLRO sign-off) | Compliance + Technology | Week 12–14 |
| 10 | Parallel run (new system alongside existing process) | All teams | Week 14–16 |
| 11 | Go-Live and hypercare | Technology | Week 16–18 |
| 12 | Post-go-live model validation (30-day) | Compliance + Technology | Week 18–22 |

## 2. RACI

R = Responsible · A = Accountable · C = Consulted · I = Informed

| Activity | Compliance – FCC (KYC) | Technology | Head of FCC & MLRO | Risk | Audit |
|---|---|---|---|---|---|
| Define scoring logic and weights | R/A | I | C | C | I |
| Build scoring engine | I | R/A | I | I | I |
| Define and approve override rules | R/A | I | C | C | I |
| Build override engine | I | R/A | I | I | I |
| Update configuration tables | R/A (Maker) | I | C (Checker for high-risk changes) | I | I |
| Approve manual override (downgrade) | C | I | R/A | I | I |
| SIT execution | I | R/A | I | I | C |
| UAT sign-off | R/A | C | A | C | I |
| Annual calibration | R/A | C | A | C | I |
| Independent model audit | I | I | I | I | R/A |

## 3. Assumptions, constraints and dependencies

**Assumptions**
- Screening vendor agreements in place before Phase 4.
- Onboarding platform can call the CRR scoring API pre-activation.
- Core banking can receive and store the final CRR rating and next review date.
- Transaction monitoring can consume the CRR rating for scenario tuning.
- All configuration data can be pre-loaded from the CRAM configuration workbook before go-live.

**Constraints**
- All customer data must remain in **UAE jurisdiction** (data localisation).
- **OVR-001 to OVR-007 must be hard-coded as non-configurable**; Compliance alone cannot modify them even with maker-checker.
- CRAM must be deployed before any new customer onboarding on the digital platform.
- `model_version_id` must be stored in all scoring records **from Day 1** to enable historical comparison.

**Dependencies**
- Screening vendor(s) API availability and contractual terms.
- Onboarding platform readiness to integrate the CRR pre-activation check.
- Core banking CRR field availability.
- Compliance completion of training on the new CRR system before UAT.

## 4. Acceptance criteria

Accepted by Head of Compliance and Head of FCC & MLRO when:
- All **12 mandatory SIT test cases** pass with **zero defects** in scoring logic, override enforcement and audit trail.
- UAT signed off by Head of Compliance/MLRO and **≥2 Compliance Officers**.
- 30-day parallel run shows **<0.1% discrepancy** between manual and system CRR for sampled customers.
- **CBUAE examination pack for 25 customers** generated within **2 hours**.
- Audit store confirmed **immutable** by Technology and verified by Internal Audit.
- **OVR-001 Hard Stop** confirmed non-bypassable by penetration test and UAT.
- Configuration **maker-checker** confirmed enforced by QA regression test.
- Review scheduler confirmed generating correct review due dates by risk-rating band.

## 5. SIT / UAT / validation test pack (TC-001 … TC-022)

These scenarios validate the methodology end-to-end. The "12 mandatory SIT TCs"
in the acceptance criteria are drawn from this pack (scoring boundaries,
non-dilution floors, hard stops, missing data, event rescore, config change,
maker-checker).

| Test ID | Scenario | Expected outcome |
|---|---|---|
| TC-001 | Low-risk resident NP, strong digital ID, low-risk product, no alerts | Low rating; standard CDD; activation permitted; 36-month max review |
| TC-002 | Raw score exactly 1.5000, no override | Low mathematical rating; threshold decision uses unrounded raw score |
| TC-003 | Raw score exactly 1.5001, no override | Medium mathematical rating; CDD plus targeted controls |
| TC-004 | Raw score exactly 2.1500, no override | Medium mathematical rating |
| TC-005 | Raw score exactly 2.1501, no override | High mathematical rating; EDD and approval |
| TC-006 | Foreign PEP with otherwise Low profile | High final rating due to non-dilutable PEP floor |
| TC-007 | Confirmed sanctions/TFS true match | Hard stop/freeze/escalate; no onboarding |
| TC-008 | Legal entity refuses to disclose UBO | Reject/prohibited or High pending remediation; no composite-score dilution |
| TC-009 | SME with complex but verified ownership and medium-risk product | Medium or High depending on complexity; EDD where required |
| TC-010 | Merchant acquiring request for high-risk MCC and cross-border settlement | High rating; merchant EDD and product approval before activation |
| TC-011 | Resident using document upload only with liveness not performed | High or onboarding hold due to weak digital assurance |
| TC-012 | Device farm detected across multiple applications | High/fraud review; linked applications held |
| TC-013 | Existing Low customer suddenly receives 5× expected turnover with rapid pass-through | Event-driven rescore; Medium/High; TM investigation |
| TC-014 | Country library changes a country from Medium to High | Batch rescore affected customers; workflow tasks for newly High customers |
| TC-015 | New product added: international transfer | Pre-activation rescore; product/geography monitoring rules activated |
| TC-016 | Manual downgrade attempted below mandatory High floor | System blocks or requires policy-authorised exception; cannot go below floor |
| TC-017 | False positive sanctions match cleared | Screening status updated; rating recalculated; audit trail retained |
| TC-018 | FI partner with downstream high-risk corridor exposure | High; FI EDD, sanctions controls review and senior approval |
| TC-019 | Unassessed country in source-of-wealth field | At least Medium pending assessment; High if combined with other risk indicators |
| TC-020 | Product control weakness identified in payment API | Risk uplift/remediation; no control-based reduction below inherent score |
| TC-021 | STR/SAR filed on existing customer | High floor, enhanced monitoring and exit/risk-acceptance assessment |
| TC-022 | Periodic review overdue for High customer | Workflow breach, escalation and possible restriction per policy |

## 6. Methodology implementation checklist (Section 22, for traceability)

1. Approve methodology and issue frozen `model_version_id` — Model Governance / MLRO.
2. Configure authoritative thresholds and active factor weights — Technology / FCC.
3. Configure segment and parameter libraries (incl. FI weights) — FCC / Technology.
4. Configure hard stops, High floors and Medium floors with priorities — FCC / Technology.
5. Map all mandatory fields to source systems and owners — Data Governance.
6. Complete data-quality testing and remediation/exception register — Data Governance / Operations.
7. Complete vendor validation (screening, digital ID, device, fraud) — Vendor Governance / FCC / Fraud.
8. Complete SIT and close all Critical/High defects — Technology QA.
9. Complete UAT with Compliance, Operations, Fraud, Sanctions users — Business / FCC.
10. Complete calibration, parallel run and back-testing — Model Validation / FCC.
11. Complete MI/KRI dashboards and post-go-live monitoring plan — Compliance MI.
12. Obtain production go-live approval (Gate 6) — Senior Governance Forum.
