# 12 — Production infrastructure (queue · PostgreSQL · identity · auth)

## What's built

### 1. PostgreSQL append-only audit store
- **Prisma schema** — `assessments`, `feed_events`, `audit_log`, `mlro_alerts`, `vendor_identity`, `feed_queue`, `app_users`
- **DB-level immutability** — migration `20260629000001_append_only` revokes UPDATE/DELETE on audit tables for `cram_app` role and adds triggers that reject mutations
- **`server/db/auditStore.ts`** — INSERT-only persistence (replaces JSONL)

### 2. Durable feed queue
Pluggable via `QUEUE_DRIVER`:

| Driver | Use case |
|--------|----------|
| `postgres` | Default — `feed_queue` table, poll worker every 500ms |
| `sqs` | AWS SQS FIFO (`SQS_FEED_QUEUE_URL`, dedupe by event id) |
| `kafka` | Redpanda/Kafka (`KAFKA_BROKERS`, topic `cram.feed.events`) |

Flow: `POST /api/v1/crr/events` → resolve identity → enqueue → worker → `ingestFeedEvent()`.

UI demo uses `X-CRAM-Sync: true` for immediate processing.

### 3. Identity resolution
- **`vendor_identity`** table maps `(vendorId, source) → customerId`
- **`server/identity/resolver.ts`** — `resolveVendorIdentity()`, seeded demo mappings (`VND-10005` → `ACT00005`, etc.)
- Inbound events accept **`customerId`** OR **`vendorSubjectId`**
- Unknown vendors → `422 deadLetter`

API: `GET/POST /api/v1/crr/identity/mappings` (MLRO only)

### 4. Production auth / RBAC
- **`AUTH_MODE=dev`** — `Authorization: Bearer dev:<email>:<Role>` or `X-CRAM-User` + `X-CRAM-Roles`
- **`AUTH_MODE=oidc`** — JWT validated against IdP JWKS (`OIDC_ISSUER`, `OIDC_AUDIENCE`)
- Six roles per build spec: Analyst, Reviewer, MLRO, ConfigMaker, ConfigChecker, ServiceAccount
- Route capabilities enforced in `server/auth/middleware.ts`

## Run locally

```bash
cp .env.example .env
npm run db:up          # PostgreSQL via Docker
npm install
npm run db:migrate     # schema + append-only triggers
npm run dev            # Vite + API
```

## Dev auth tokens

| User | Token |
|------|-------|
| Tayel Mohamed (Head of Financial Crimes) | `Bearer dev:tayel.mohamed@mal.ae:MLRO,Reviewer` |
| Walid Elsheikha (Head of Compliance) | `Bearer dev:walid.elsheikha@mal.ae:MLRO,ConfigChecker` |
| David Henry (Chief of Product) | `Bearer dev:david.henry@mal.ae:Reviewer,ConfigMaker` |
| Feed service | `Bearer dev:feeds@mal.ae:ServiceAccount` |

See **docs/24-PLATFORM-USER-ACCESS.md** for full access profiles and production IdP setup.

## Example: vendor webhook (async queue)

```bash
curl -X POST http://localhost:3010/api/v1/crr/events \
  -H "Authorization: Bearer dev:feeds@mal.ae:ServiceAccount" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "vendor-ev-001",
    "source": "adverse-media",
    "kind": "adverse_media",
    "vendorSubjectId": "VND-10005",
    "at": "2026-06-29T12:00:00Z",
    "severity": "high",
    "payload": { "confidence": 0.9 },
    "headline": "Sanctions evasion allegation"
  }'
# → 202 { accepted: true, queue: "postgres" }
```

## Still to do
- Wire bank IdP groups → CRAM roles in production OIDC
- High-availability PostgreSQL + managed SQS/Kafka
- Dead-letter queue admin UI and identity resolution manual queue
