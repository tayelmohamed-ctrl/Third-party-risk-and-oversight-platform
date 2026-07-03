# 20 — Partner integration Phase 1a (Screening Orchestrator)

**Status:** IMPLEMENTED (Vital4 adapter + disposition API)  
**Depends on:** Phase 0 sign-off (`docs/19-PARTNER-INTEGRATION-PHASE0-SIGNOFF.md`)

---

## What was built

### Database (Prisma)
- `screening_cases` — Vital4 case tracking + normalized snapshot
- `case_links` — Vital4 ↔ Oscilar cross-reference (Phase 2 ready)
- `webhook_log` — idempotent webhook intake

### Server modules
| Path | Role |
|------|------|
| `server/screening/orchestrator.ts` | Initiate · webhook · disposition |
| `server/screening/normalize.ts` | Vital4 → CRAM field mapping |
| `server/screening/store.ts` | PostgreSQL persistence |
| `server/integrations/vital4/client.ts` | API client (mock + live) |
| `server/integrations/vital4/webhookAuth.ts` | HMAC verification |
| `server/routes/screening.ts` | HTTP routes |
| `src/config/partnerIntegration.ts` | Phase 0 locked config |

### API endpoints

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | `/webhooks/vital4` | HMAC | Vital4 async results |
| POST | `/api/v1/crr/screening/initiate` | score | Start Vital4 screen |
| GET | `/api/v1/crr/screening/customer/:id` | bearer | Customer screening history |
| GET | `/api/v1/crr/screening/:caseId` | bearer | Single case |
| POST | `/api/v1/crr/screening/:caseId/disposition` | review | Analyst disposition |
| GET | `/api/v1/crr/integrations/status` | bearer | Integration health |

---

## Local dev (mock mode)

```bash
# .env — VITAL4_API_KEY unset → mock mode
curl -X POST http://localhost:3010/api/v1/crr/screening/initiate \
  -H "Authorization: Bearer dev:analyst@mal.ae:Analyst" \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "ACT00099",
    "customerName": "Test User",
    "licenseRegion": "UAE",
    "subject": { "type": "individual", "fullName": "Test User", "nationality": "AE" }
  }'
```

Simulate Vital4 webhook:

```bash
curl -X POST http://localhost:3010/webhooks/vital4 \
  -H "Content-Type: application/json" \
  -d '{
    "event_id": "ev-demo-1",
    "event_type": "screening.completed",
    "case_id": "<vendorCaseId from initiate response>",
    "customer_id": "ACT00099",
    "status": "completed",
    "results": { "sanctions": "clear", "pep": "none", "adverse_media": "none", "watchlist": "clear" },
    "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"
  }'
```

Disposition (Reviewer+):

```bash
curl -X POST http://localhost:3010/api/v1/crr/screening/<caseId>/disposition \
  -H "Authorization: Bearer dev:mlro@mal.ae:MLRO" \
  -H "Content-Type: application/json" \
  -d '{ "disposition": "clear", "notes": "Reviewed — no match" }'
```

---

## Next: Phase 1b

- Shufti Pro KYC-only adapter (identity → `KycQualityContext`)
- `POST /api/v1/crr/onboarding/start` case state machine
- Wire test bench to pull `getCustomerScreeningSnapshot()` into capture
