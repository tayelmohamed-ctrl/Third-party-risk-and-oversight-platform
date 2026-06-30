# 22 — Partner integration Phase 1c (Screening UI + MLRO tracker)

**Status:** IMPLEMENTED  
**Depends on:** Phase 1b (`docs/21-PARTNER-INTEGRATION-PHASE1B.md`)

---

## What was built

### Backend list APIs

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/v1/crr/screening/queue` | Disposition queue (pending + SLA breach count) |
| GET | `/api/v1/crr/onboarding/active` | Non-terminal onboarding cases |
| GET | `/api/v1/crr/onboarding/recent` | Recent cases including terminal |

### Frontend

| Path | Role |
|------|------|
| `src/pages/Screening.tsx` | Vital4 disposition queue — case list, detail, disposition actions |
| `src/components/dashboard/OnboardingTracker.tsx` | MLRO dashboard — active onboarding pipeline |
| `src/lib/screeningUi.ts` | SLA helpers, status pills |
| `src/lib/api.ts` | `apiScreeningQueue`, `apiDisposeScreeningCase`, `apiActiveOnboarding` |

### Navigation

- **Operate → Screening & Monitoring** (`/screening`) — replaces Stub
- **Executive Dashboard** — Onboarding pipeline card with links to disposition queue

---

## Disposition queue UX

1. Open `/screening` — loads pending Vital4 cases
2. Select case — view sanctions / PEP / adverse / watchlist snapshot
3. Disposition: **false positive**, **clear**, or **true match** (+ optional notes)
4. Linked onboarding case auto-advances (Phase 1b orchestrator hook)

**Auth:** disposition requires `review` capability (Analyst or MLRO dev persona).

**SLA:** potential matches show countdown; breached cases flagged (4h per Phase 0 sign-off).

---

## MLRO dashboard tracker

Shows active onboarding cases with:
- State (`KYC_PENDING`, `DISPOSITION_REQUIRED`, etc.)
- Shufti status
- Vital4 case link → `/screening?caseId=…`
- Final rating when scored

CTA when cases need disposition → opens screening queue.

---

## Local verification

```bash
cd cram-app && npm run dev

# 1. Test bench → Start partner onboarding (creates case)
# 2. Dashboard → Onboarding pipeline shows active case
# 3. For potential match: simulate Vital4 webhook with pep=foreign
# 4. /screening → disposition → onboarding scores on clear
```

---

## Next: Phase 2

- Oscilar TM integration + txn screening → Vital4 mirror
- TM alert surface on `/screening`
