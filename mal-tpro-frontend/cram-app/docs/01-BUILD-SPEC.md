# 01 — Build Specification

This is the technical blueprint. Logic detail is in `docs/knowledge/` and
`docs/02-SCORING-ENGINE-CONTRACT.md`; this file covers architecture, stack, data
model, security and delivery. The stack below is a firm recommendation — swap
language/framework if your team prefers, but keep the **boundaries** (pure engine,
config-as-data, immutable audit, SoD).

## 1. Architecture (layers)
```
                ┌─────────────────────────────────────────────┐
  MLRO / Analyst│  Web UI (assess, review, approve, override,  │
   browser  ───►│  config maker-checker, MI, exam pack)        │
                └───────────────┬─────────────────────────────┘
                                │ REST/OpenAPI (authn + RBAC)
                ┌───────────────▼─────────────────────────────┐
  Product/Eng   │  API / Application service                   │
  systems   ───►│  - assessment orchestration & workflow       │
  (onboarding,  │  - screening orchestrator (vendor adapters)  │
   core, TM)    │  - config service (maker-checker, versions)  │
                │  - audit writer (append-only)                │
                │  - review scheduler + event-hook intake      │
                └───────┬───────────────────────┬─────────────┘
                        │ calls (pure, sync)     │
          ┌─────────────▼───────────┐   ┌────────▼───────────┐
          │  @cram/engine (PURE)    │   │  PostgreSQL         │
          │  - pipeline (7.2)       │   │  - config (versioned)│
          │  - formulas (2.5)       │   │  - reference libs    │
          │  - overrides/floors     │   │  - assessments       │
          │  - band mapping (param) │   │  - audit (append-only)│
          │  NO I/O, NO clock       │   │  - users/roles       │
          └─────────────────────────┘   └────────────────────┘
```

The **engine package** receives a fully-resolved input (all parameter scores +
screening results + the active config snapshot) and returns a result object. It
never reads the DB, calls a vendor, or reads the clock. Everything non-deterministic
(reference-data lookups, screening, timestamps, persistence) happens in the
application layer and is passed in.

## 2. Recommended stack
- **Monorepo:** pnpm workspaces (or Nx).
- **Engine:** TypeScript, zero deps except `decimal.js`. Published as `@cram/engine`.
- **API/app:** TypeScript + NestJS (or Fastify). OpenAPI generated from code.
- **DB:** PostgreSQL + Prisma. Append-only audit enforced with DB triggers/`REVOKE UPDATE,DELETE`.
- **Auth:** OIDC/SSO (the bank's IdP) → roles; RBAC enforced server-side.
- **Frontend:** Next.js + React + a component library; server-fetched, no business logic in the browser.
- **Tests:** vitest/jest for engine (golden vectors), supertest for API, Playwright for UI smoke.
- **Alt:** Python + FastAPI + SQLAlchemy + `Decimal` is equally valid; keep the same boundaries.

## 3. Data model (core tables)
Config and reference tables are **versioned** and **maker-checked**. Assessment
and audit tables are **append-only**.

- `model_version` — `model_version_id`, status (draft/frozen/retired), effective_from/to, approved_by.
- `factor_weights` — segment, lifecycle, factor, weight, model_version_id. (seed: `factor_weights.csv`)
- `parameters` — segment, lifecycle, factor, param_name, intra_factor_weight, mandatory_flag, model_version_id.
- `band_boundaries` — segment, model_version_id, low_max, medium_max (the parameterised boundary, see contract §band).
- `override_rules` — rule_id (OVR-001..020), class (PROHIBITED/HIGH/MEDIUM), priority, active_flag, auto_evaluated, segment_applicability, model_version_id. **OVR-001..007 active_flag = LOCKED.** (seed: `override_rules.csv`)
- `country_risk` — country, iso, fatf, basel, sanctions, safe_haven, overall, band, firm_score, library_version. (seed: `country_risk.csv`)
- `profession_risk` — profession, score, library_version. (seed: `profession.csv`)
- `nature_of_business_risk` — activity, score (1–4; 4=prohibition), library_version. (seed: `nature_of_business.csv`)
- `product_baseline` — product/service, baseline, drivers, treatment, high_trigger, library_version. (seed: `product_baseline.csv`)
- `sanctions_programme` — category A/B/C → countries + handling rule; safe-haven list. (seed: `sanctions_programme.json`)
- `assessment` — assessment_id, customer_id, segment, lifecycle, status, model_version_id, library_versions{}, created_by, reviewed_by, prepared_at, scored_at.
- `assessment_input` — per-parameter raw inputs + screening results (immutable snapshot).
- `assessment_result` — composite (decimal ≥4dp), math_band, override_floor, final_rating, boundary_set_used, outcomes{cdd_tier, approval_authority, review_months, next_review_date, monitoring}, explainability JSON.
- `override_event` — manual override: before/after rating, rule/manual flag, reason, approver(MLRO), expiry, evidence_ref, timestamp.
- `audit_log` — append-only actor/action/entity/before/after/timestamp for every state change and config change.
- `user` / `role` — Analyst, Reviewer, MLRO, ConfigMaker, ConfigChecker, ServiceAccount.

## 4. RBAC & segregation of duties
| Capability | Analyst | Reviewer | MLRO | ConfigMaker | ConfigChecker | Service |
|---|---|---|---|---|---|---|
| Create/score assessment | ✓ | ✓ | ✓ | | | ✓ (API) |
| Review an assessment (not own) | | ✓ | ✓ | | | |
| Approve High / prohibited-but-retained | | | ✓ | | | |
| Manual override (with justification) | | | ✓ | | | |
| Propose config change (Maker) | | | | ✓ | | |
| Approve config change (Checker) | | | ✓ | | ✓ | |
| Change OVR-001..007 active_flag | locked for everyone | | | | | |
| Read MI / exam pack | ✓(MI) | ✓ | ✓ | | | |

Enforce that prepared-by ≠ reviewed-by, and config Maker ≠ Checker.

## 5. API surface (for the product team)
- `POST /api/v1/crr/score` — score a customer (see technical-implementation skill for the contract). Returns composite, math_rating, override_results[], final_rating, model_version_id, boundary_set, blocked_parameters[].
- `GET /api/v1/crr/history/{customer_id}` — all historical assessments, desc by scored_at.
- `POST /api/v1/crr/events` — event-hook intake (SAR/STR, screening update, activity breach, product change) → schedules/triggers rescore.
- `PATCH /api/v1/crr/config/{table}` — maker-checker headers; validates Maker≠Checker, weight sums = 1.0, rejects locked OVR with 403.
- `GET /api/v1/crr/reference/{library}` — versioned reference-data reads.
- `GET /api/v1/crr/exam-pack?sample=...` — CBUAE examination export (target: 25 customers < 2 hours).

## 6. Delivery plan (phased)
1. **Foundations** — monorepo, DB schema + migrations, load all `seed/data` as model version `…-FREEZE-01` (draft), auth/RBAC skeleton.
2. **Engine (NP)** — pure `@cram/engine`: formulas (2.5), pipeline (7.2), override precedence (7.3), parameterised band boundary, missing-data BLOCKED. Pass all NP golden vectors.
3. **Engine (LP) + reference services** — LP templates, country 4-component model, profession/NoB/product lookups feeding parameter scores. Pass LP vectors.
4. **Application + API** — assessment workflow (A–H), screening orchestrator adapters, audit writer (append-only), config service (maker-checker), review scheduler + event hooks, the API surface.
5. **MLRO UI** — assess/review/approve/override, explainability view, config maker-checker screens, MI/KRI dashboard, exam-pack export.
6. **Hardening & acceptance** — SIT (12 mandatory), UAT (MLRO + ≥2 officers), parallel run (<0.1% discrepancy), pen-test the hard-stop lock, freeze the model version once open items are dispositioned.

Acceptance criteria are in the `cram-implementation-brd` skill (delivery-raci-acceptance) and the golden vectors here.

## 7. Environments & controls
- Data residency: host within UAE jurisdiction.
- Encryption: at rest (AES-256), in transit (TLS 1.2+).
- Performance: scoring < 2s for 95% of requests; batch 10,000 assessments for periodic runs.
- Recoverability: RPO < 1h, RTO < 4h.
