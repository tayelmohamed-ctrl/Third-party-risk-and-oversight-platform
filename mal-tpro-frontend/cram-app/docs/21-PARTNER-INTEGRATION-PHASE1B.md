# 21 — Partner integration Phase 1b (Onboarding Orchestrator)

**Status:** IMPLEMENTED (Shufti KYC → Vital4 screening → CRAM score)  
**Depends on:** Phase 1a (`docs/20-PARTNER-INTEGRATION-PHASE1A.md`)

---

## What was built

### Database
- `onboarding_cases` — state machine, Shufti/Vital4 refs, KYC context, score outcome

### Server modules
| Path | Role |
|------|------|
| `server/onboarding/orchestrator.ts` | Start · Shufti webhook · Vital4 chain · score |
| `server/onboarding/store.ts` | PostgreSQL persistence |
| `server/onboarding/types.ts` | State machine + API types |
| `server/integrations/shuftipro/client.ts` | KYC verification (mock + live) |
| `server/integrations/shuftipro/normalize.ts` | Shufti → `KycQualityContext` (identity only) |
| `server/integrations/shuftipro/webhookAuth.ts` | HMAC verification |
| `server/integrations/coreBanking/notify.ts` | Outbound `onboarding.*` webhooks |
| `server/routes/onboarding.ts` | HTTP routes |

### State machine

```
INITIATED → KYC_PENDING → SCREENING_PENDING → DISPOSITION_REQUIRED → READY_TO_SCORE → SCORED | BLOCKED
```

- **Shufti** writes identity fields only; AML/list data in payload is ignored (Vital4 authority).
- **Vital4 webhook** advances onboarding; potential match → `DISPOSITION_REQUIRED` + core banking notify.
- **Disposition clear** on linked screening case → auto-score → `SCORED` + `onboarding.rating_ready`.

### API endpoints

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | `/webhooks/shuftipro` | HMAC | Shufti KYC result |
| POST | `/api/v1/crr/onboarding/start` | score | Core banking → start flow |
| GET | `/api/v1/crr/onboarding/customer/:id` | bearer | Latest onboarding case |
| GET | `/api/v1/crr/onboarding/customer/:id/partner-sync` | bearer | KYC + screening for test bench |
| GET | `/api/v1/crr/onboarding/:caseId` | bearer | Single case |

### Outbound core banking events

| Event | When |
|-------|------|
| `onboarding.rating_ready` | Score persisted (non-prohibited) |
| `onboarding.blocked` | KYC declined, true match, DQ block, or Prohibited |
| `onboarding.disposition_required` | Vital4 potential match pending analyst review |

Set `CORE_BANKING_WEBHOOK_URL` for live delivery; unset → logged to console (mock).

---

## Local dev (mock mode)

```bash
# Shufti + Vital4 mock — no API keys required
curl -X POST http://localhost:3010/api/v1/crr/onboarding/start \
  -H "Authorization: Bearer dev:analyst@mal.ae:Analyst" \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "ACT00100",
    "customerName": "Test Onboard",
    "licenseRegion": "UAE",
    "mode": "individual",
    "subject": { "type": "individual", "fullName": "Test Onboard", "nationality": "AE", "country": "AE" },
    "capture": { "expectedMonthlyBand": "2", "segment": "Retail" }
  }'
```

Mock mode auto-chains: Shufti accept → Vital4 initiate → clear webhook → score → `SCORED`.

Partner sync (test bench):

```bash
curl http://localhost:3010/api/v1/crr/onboarding/customer/ACT00100/partner-sync \
  -H "Authorization: Bearer dev:analyst@mal.ae:Analyst"
```

---

## UI

**Risk Test Bench** (`CramRiskTestBench.tsx`) — when API is live:
- **Start partner onboarding** — runs full Shufti → Vital4 → score pipeline
- **Sync KYC + screening** — pulls `partner-sync` into form fields

---

## Next: Phase 1c

- `/screening` disposition queue UI
- Onboarding case tracker in MLRO dashboard
