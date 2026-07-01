# Partner Integration — Phase 2 (Oscilar TM)

**Status:** Implemented  
**Phase:** 2 — Live transaction monitoring + txn screening mirror to Vital4

## Scope

Phase 2 wires Oscilar as the **transaction monitoring authority**. When Oscilar raises alerts:

1. **TM alerts (high/critical)** → CRAM trigger pipeline (`transaction_alert` → `TRANSACTION_ANOMALY` re-rating)
2. **Txn screening list hits** → **mirrored to Vital4** (Oscilar never writes CRAM screening fields)
3. Alerts persisted in `tm_alerts` with links to Vital4 cases and feed outcomes

## Architecture

```
Oscilar webhook
    │
    ├─► tm_alerts (persist)
    ├─► vendor_identity mapping (alert_id → customer)
    │
    ├─ list hit / txn screening?
    │       └─► initiateScreening(mirrorSource: oscilar) → Vital4
    │               └─► case_links + screening_cases
    │
    └─ high/critical severity?
            └─► ingestFeedEvent(transaction_alert) → reRate()
```

## Database

Migration: `20260630120000_oscilar_tm_alerts`

Table `tm_alerts` tracks Oscilar alert lifecycle: `open` → `mirrored` / `feed_processed` → disposition via Vital4 queue.

## API Endpoints

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | `/webhooks/oscilar` | HMAC (`x-oscilar-signature`) | Inbound TM / screening alerts |
| GET | `/api/v1/crr/tm/alerts` | Bearer | Live alert queue |
| GET | `/api/v1/crr/tm/alerts/:id` | Bearer | Alert detail (internal or Oscilar id) |
| GET | `/api/v1/crr/tm/customer/:customerId` | Bearer | Customer alert history |
| POST | `/api/v1/crr/tm/simulate` | Bearer + score | Dev mock alert (Test Bench) |

## Webhook security

- Header: `x-oscilar-signature` (HMAC-SHA256)
- Secret: `OSCILAR_WEBHOOK_SECRET`
- Replay window: 5 minutes (same as Vital4/Shufti)
- Idempotency: `event_id` in `webhook_log`

## Environment

```bash
OSCILAR_API_KEY=           # unset = mock mode
OSCILAR_MODE=mock          # force mock even with key
OSCILAR_WEBHOOK_SECRET=    # production HMAC secret
```

## Vital4 mirror rules

Mirror triggered when any of:

- `alert_type` is `transaction_screening` or `both`
- `list_hit: true`
- sanctions/PEP/watchlist signals contain hit/match/potential

Uses existing `vital4MirrorFromOscilar()` and `initiateScreening({ mirrorSource: "oscilar" })`.

## Feed pipeline

High/critical TM alerts enqueue `transaction_alert` on source `transaction-monitoring`. Feed event id: `oscilar-{alert_id}` (idempotent).

## UI

- **Transaction Monitoring** → Alerts & cases tab: live alert queue from API
- **Test Bench** → Phase 2 simulate buttons (TM alert vs list hit + mirror)
- **Feeds** → transaction-monitoring source shows Oscilar webhook status

## Test

```bash
npm test -- oscilar-orchestrator
```

## Manual webhook (dev — no secret in non-production)

```bash
curl -X POST http://localhost:3010/webhooks/oscilar \
  -H "Content-Type: application/json" \
  -d '{
    "event_id": "ev-test-1",
    "event_type": "alert.created",
    "alert_id": "OS-ACT00005-test1",
    "customer_id": "ACT00005",
    "customer_name": "Omar Khalid",
    "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'",
    "alert_type": "transaction_screening",
    "severity": "critical",
    "list_hit": true,
    "rule_id": "OS-TM-010",
    "rule_name": "Sanctions name proximity"
  }'
```

## Next (Phase 3+)

- AiPrise KYB orchestration
- Bi-directional Oscilar case sync (Investigation Hub)
- goAML / FinCEN filing from reporting templates
