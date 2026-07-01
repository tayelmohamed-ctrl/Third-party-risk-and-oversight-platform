# 10 — Dynamic re-rating (failure-theme #1: static ratings) — **STRONG & COMPLETE**

**Regulator failure mode addressed:** *"Risk is scored once at onboarding and never
refreshed. No event-driven re-rating and no periodic refresh."* (the USAA / Danske
theme). **Status: built end-to-end** — not blueprint-only.

## Status matrix

| Capability | Before | Now |
|---|---|---|
| Review cadence (Low 5y / Med 3y / High 1y) | ◐ Defined only | **Strong** — `REVIEW_MONTHS`, `isReviewDue()`, server scheduler |
| Event-driven re-rating | ◐ Blueprint | **Strong** — 9 triggers, `reRate()`, explainable deltas |
| Perpetual KYC / continuous monitoring | ◐ Blueprint | **Strong** — customers wired to feeds + scheduler |
| Trigger pipeline (adverse media / SAR / ownership) | ✗ Missing | **Strong** — `FeedAdapter` → queue → `processEvent()` |
| Server-side scheduler | ✗ Missing | **Strong** — nightly 02:00 + demo tick |
| Persistence / audit | ✗ Stateless | **Strong** — PostgreSQL append-only (REVOKE UPDATE/DELETE) |

Live status on the **Executive Dashboard** (`Theme1Status` component).

## What was built
1. **Re-rating engine** — `src/engine/rerating.ts` (pure, deterministic):
   - **Triggers:** `ONBOARDING`, `PERIODIC_REVIEW`, `ADVERSE_MEDIA`, `SAR_FILED`,
     `OWNERSHIP_CHANGE`, `SANCTIONS_LIST_UPDATE`, `PEP_STATUS_CHANGE`,
     `TRANSACTION_ANOMALY`, `MANUAL_REVIEW`.
   - **`applyTrigger(input, trigger)`** mutates the snapshot, then re-scores.
   - **Periodic-review scheduler:** `REVIEW_MONTHS` = Low 60 / Medium 36 / High 12.
   - **`reRate(prev, trigger, …)`** — fully reproducible assessment with input snapshot.
2. **Persistence** — PostgreSQL append-only audit (`server/db/auditStore.ts`).
3. **UI** — `ReRating.tsx`, `Feeds.tsx`, `Theme1Status` on Dashboard.
4. **Trigger pipeline** — see `docs/11-TRIGGER-PIPELINE.md` and `docs/12-PRODUCTION-INFRA.md`.

## How it maps to the examiner expectation
- *Dynamic, not static:* ratings change on events and on a schedule.
- *Reproducible:* each assessment stores its input snapshot.
- *Connected:* fresh review-due date + CDD/EDD/monitoring consequences.

## Run on localhost:5174
```bash
npm run db:up && npm run db:migrate && npm run dev
```
Open http://localhost:5174/ — Theme 1 panel shows **Strong & complete** when API is live.
