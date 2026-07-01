# 27 — Investigation Cases (FFIEC Phase 1, Step 1)

Phase 1 kickoff replaces the static Investigation Hub demo with a **live case store** backed by PostgreSQL. High and critical TM alerts auto-open investigation cases.

## What shipped

| Layer | Location |
|-------|----------|
| Schema | `prisma/schema.prisma` — `InvestigationCase`, `CaseEvidence`, `FilingDraft`, `TrainingRecord` |
| Migration | `prisma/migrations/20260701100000_investigation_cases/` |
| Store | `server/investigations/store.ts` |
| Orchestrator | `server/investigations/orchestrator.ts` |
| Routes | `server/routes/investigations.ts` |
| TM hook | `server/tm/orchestrator.ts` — `createCaseFromTmAlert()` after alert persist |
| UI | `src/pages/InvestigationHub.tsx` — live queue + demo fallback |
| Audit UI | `src/pages/AuditLog.tsx` — `/audit` |
| API client | `src/lib/api.ts` — `apiListCases`, `apiCaseStats`, etc. |

## Auto-case rule

When Oscilar delivers a **high** or **critical** TM alert:

1. Alert is persisted (`tm_alerts`)
2. Feed pipeline runs (if warranted)
3. `createCaseFromTmAlert()` opens a case (deduped by `tm_alert_id`)
4. Source TM alert is attached as first evidence item
5. Audit entry: `case.created.from_tm`

## REST API

All routes require auth (`Authorization: Bearer dev:email:Roles`).

| Method | Path | Capability | Purpose |
|--------|------|------------|---------|
| GET | `/api/v1/crr/cases/stats` | any authenticated | Queue counts + SLA breach soon |
| GET | `/api/v1/crr/cases` | any authenticated | List cases (`?status=`) |
| GET | `/api/v1/crr/cases/:id` | any authenticated | Case detail + evidence |
| POST | `/api/v1/crr/cases` | `review` | Manual case create |
| PATCH | `/api/v1/crr/cases/:id` | `review` | Assign or advance pipeline step |
| POST | `/api/v1/crr/cases/:id/evidence` | `review` | Append evidence |
| POST | `/api/v1/crr/cases/:id/disposition` | `review` | Close / escalate / SAR recommend |

## UI behaviour

- **Investigation Hub** loads live cases from the API. When the queue is empty, the Omar Khalid demo case is shown with an **Illustrative demo** banner.
- **Audit Log** (`/audit`) reads `GET /api/v1/crr/audit` — append-only PostgreSQL trail.
- **Dashboard** KPI tiles labelled **Illustrative** are placeholders; case count tiles wire to `/cases/stats` when the API is online.

## Local setup

```bash
cd cram-app
npm run db:up          # start Postgres
npm run db:migrate     # apply investigation_cases migration
npm run dev            # client + server
```

Simulate a high TM alert (creates case automatically):

```bash
curl -X POST http://localhost:3001/api/v1/crr/tm/simulate \
  -H "Authorization: Bearer dev:feeds@mal.ae:ServiceAccount" \
  -H "Content-Type: application/json" \
  -d '{"customerId":"ACT00005","severity":"high","ruleId":"OS-TM-003"}'
```

Switch to **Reviewer** or **MLRO** persona in the header to disposition cases.

## Next (Phase 1 remaining)

- ~~Training records MVP~~ — see `29-TRAINING-RECORDS-PHASE1.md`
- ~~OIDC auth~~ — see `30-OIDC-AUTH-PHASE1.md`
- ~~FFIEC examination matrix tracker~~ — see `31-FFIEC-EXAMINATION-MATRIX.md`

**Phase 1 complete.**

## Tests

```bash
npm test -- investigation-cases
```
