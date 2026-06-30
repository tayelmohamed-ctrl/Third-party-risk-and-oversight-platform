---
name: cram-implementation-brd
description: >-
  The Business Requirements Document (BRD) for implementing the CRAM Customer
  Risk Assessment Methodology into a CBUAE digital bank's technology stack — the
  Compliance-to-Technology handover that defines WHAT must be built, tested and
  accepted. Use this skill WHENEVER work touches: the CRAM/CRR build,
  scoring-engine or override-engine requirements, screening integration,
  configuration management (maker-checker, weights, country library, product
  baseline), the audit/immutable store, periodic-review scheduler, event-driven
  rescore hooks, compliance dashboards and reports, functional requirements
  (FR-001…FR-020), non-functional requirements (NFR-001…NFR-008), reporting
  requirements (RPT-001…RPT-008), the delivery plan/milestones, RACI,
  assumptions/constraints/dependencies, SIT/UAT and acceptance criteria, or
  requirement traceability for the CRR system. Trigger even when the user only
  says "what does the system need to do", "is this in scope", "what's the SLA",
  "which report shows X", "what's the acceptance criteria", "draft a test case",
  "who is responsible (RACI)", or "what must Technology build". The companion
  model logic lives in the cram-risk-methodology skill — read that for HOW risk
  is scored; read this for the build, test and acceptance requirements.
---

# CRAM Implementation — Business Requirements Document

This skill encodes the **BRD that hands the CRAM methodology from Compliance to
Technology**. It defines *what must be built*. Its two companions are
**`cram-risk-methodology`** (*how* risk is scored, overridden and routed) and
**`cram-technical-implementation`** (the developer handbook — the *exact* formula,
schema, APIs, pseudocode and SIT/UAT pack). Read all three together.

- **BRD reference:** CRAM-CBUAE-2026 June – BRD · Version 1.0 · Status: APPROVED – For Development
- **Business owner:** Head of Compliance / MLRO · **Classification:** Strictly Confidential – Internal
- **Model implemented:** `CRAM-CBUAE-2026-05-FREEZE-01`

## When to read the reference files

This SKILL.md carries scope, the requirement landscape and acceptance criteria.
Open a reference file when the task needs the full requirement tables:

| Need | Read |
|------|------|
| Full functional requirements FR-001…FR-020 (scoring engine, screening integration, configuration management) | `references/functional-requirements.md` |
| Non-functional requirements NFR-001…NFR-008 and reporting/dashboard requirements RPT-001…RPT-008 | `references/nonfunctional-and-reporting.md` |
| Delivery milestones, RACI, assumptions/constraints/dependencies, acceptance criteria, and the SIT/UAT test pack (TC-001…TC-022) | `references/delivery-raci-acceptance.md` |

## 1. Why this build exists

CBUAE regulation requires a documented, risk-based CDD approach. Today risk
assessment is manual (spreadsheets, inconsistent process), creating **regulatory
risk** (inconsistent CDD), **operational risk** (manual errors, missing data,
incomplete audit trails) and **reputational risk** (cannot demonstrate
compliance during CBUAE examination).

**Business objectives:**
- Consistent, automated CRR scoring engine for all segments (NP, LP, MER, FI, EMP, EXT).
- All override rules (OVR-001…OVR-020) system-enforced and **non-bypassable** by business users.
- Full, **immutable audit trail** for every CRR assessment.
- Automated periodic-review scheduling and event-driven rescoring.
- Compliance-governed configuration updates (country library, weights, product baseline) **without technology releases**, via maker-checker.
- A complete evidence repository to support CBUAE examination.

## 2. Scope

**In scope**
- CRR scoring engine for all six segments × two lifecycles (New Onboarding / Existing Review).
- Screening integration: sanctions/TFS, PEP, adverse media, internal watchlist.
- Override engine: all 20 OVR rules, Hard-Stop enforcement, High and Medium floor application.
- Configuration management: governed update of weights, country library, product baseline, override active-status.
- Audit store: immutable scoring records with all mandatory fields.
- Periodic-review scheduler: rating-based due dates, overdue queue, grace-period enforcement.
- Event-driven rescore hooks: SAR/STR, screening updates, activity triggers, product changes.
- Compliance dashboard: rating distribution, override frequency, review completion, overdue queue.
- Integration with onboarding platform, core banking, transaction monitoring, compliance workflow.

**Out of scope** (consumed/notified, not built here)
- Transaction-monitoring rules (TM consumes the CRR rating).
- SAR/STR filing system (sends an event hook to CRR when filed).
- Customer-facing interfaces.
- Anti-fraud scoring (fraud signals feed CRR as inputs; fraud scoring is separate).

## 3. Requirement landscape (what's specified)

- **Functional (FR-001…FR-020)** in three groups — CRR scoring engine (FR-001…FR-010), screening integration (FR-011…FR-015), configuration management (FR-016…FR-020). All are **MUST HAVE**. → `references/functional-requirements.md`
- **Non-functional (NFR-001…NFR-008)** — performance, availability, auditability, security, scalability, data residency, recoverability, encryption. All **MUST HAVE**. → `references/nonfunctional-and-reporting.md`
- **Reporting (RPT-001…RPT-008)** — rating distribution, override frequency, review status, rescore log, high-risk register, model performance, config change log, CBUAE examination pack. → `references/nonfunctional-and-reporting.md`
- **Delivery, RACI, acceptance, test pack** → `references/delivery-raci-acceptance.md`

### Most load-bearing requirements (do not lose in translation)
- **FR-005 / FR-006 / FR-017** — override engine applies the **most restrictive** floor; OVR-001…OVR-007 **cannot be bypassed**; their `active_flag` is **locked** and any change attempt is rejected and logged.
- **FR-007** — missing mandatory parameters return **BLOCKED** and list missing fields; **never default to Low**.
- **FR-004** — band mapping uses the **unrounded** composite (Low ≤1.5; 1.5001–2.15 Medium; >2.15 High).
- **FR-016 / FR-018 / FR-019** — config changes need **two different Compliance users** (Maker + Checker), generate a new `model_version_id` (prior version retained with `effective_to`), and must pass weight-sum validation (parameter weights per factor = 1.0; factor weights per segment-lifecycle = 1.0).
- **FR-020** — every scoring record stores the `model_version_id` active at scoring time.
- **NFR-003** — records immutable, retrievable ≥5 years, no delete/update on scored records.
- **NFR-006** — all CRR data stored within **UAE jurisdiction** (data localisation).

## 4. Acceptance criteria (summary)

The build is accepted by Head of Compliance and Head of FCC & MLRO when:
- All **12 mandatory SIT test cases** pass with zero defects in scoring, override enforcement and audit trail.
- UAT signed off by Head of Compliance/MLRO and ≥2 Compliance Officers.
- 30-day parallel run shows **<0.1% discrepancy** between manual and system CRR for sampled customers.
- A **CBUAE examination pack for 25 customers** can be generated within **2 hours**.
- Audit store confirmed **immutable** by Technology and verified by Internal Audit.
- **OVR-001 Hard Stop** confirmed non-bypassable by penetration test and UAT.
- Configuration **maker-checker** confirmed enforced by QA regression test.
- Review scheduler confirmed generating correct due dates by rating band.

Full detail and the TC-001…TC-022 test pack are in
`references/delivery-raci-acceptance.md`.

## 5. Reading the requirements correctly

- The BRD says *what*; the methodology says *how*; the handbook says *how to
  build it*. When a requirement references "Section X of the methodology" (e.g.
  FR-008 CDD mapping), resolve detail from **`cram-risk-methodology`**. When it
  references "Section 2 of the Technical Handbook" (FR-003 composite calc),
  resolve it from **`cram-technical-implementation`**.
- The BRD names six segments (NP, LP, MER, FI, EMP, **EXT**). EXT = the
  methodology's "approved extension" segment.
- Model identifiers: the BRD uses the family label `CRAM-CBUAE-2026-June`; the
  methodology's canonical frozen `model_version_id` is
  `CRAM-CBUAE-2026-05-FREEZE-01`. Use the FREEZE-01 string as the stored version.
