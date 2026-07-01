# 29 — AML Training Records (FFIEC Phase 1, Step 3)

Live **training register** for examiner evidence — staff assignments, completion tracking, and audit trail. Supports CBUAE annual return Section F and FFIEC BSA/AML training programme reviews.

## Flow

```
Bootstrap → seedTrainingIfEmpty() (role-based assignments per platform user)
        ↓
AML Training page (/training) — stats · register · assign · complete
        ↓
Audit: training.assigned · training.completed · training.waived
        ↓
Examiner pack — export via Audit Log + completion % MI
```

## Course catalogue

| ID | Course | Required roles |
|----|--------|----------------|
| AML-FCC-101 | AML/CFT Fundamentals | All FCC staff |
| AML-STR-201 | STR/SAR Filing & Narrative Quality | Reviewer, MLRO |
| AML-TM-301 | Transaction Monitoring & Investigations | Analyst, Reviewer, MLRO |
| AML-SAN-401 | Sanctions & PEP Screening | Analyst, Reviewer, MLRO |
| AML-MLRO-501 | MLRO Responsibilities & Governance | MLRO only |

Source: `src/config/trainingCatalogue.ts`

## REST API

| Method | Path | Capability | Purpose |
|--------|------|------------|---------|
| GET | `/api/v1/crr/training/stats` | authenticated | Completion %, overdue, due ≤30 days |
| GET | `/api/v1/crr/training/courses` | authenticated | Course catalogue |
| GET | `/api/v1/crr/training` | authenticated | List records (`?status=&userEmail=`) |
| GET | `/api/v1/crr/training/:id` | authenticated | Record detail |
| POST | `/api/v1/crr/training` | `review` | Assign course to staff |
| PATCH | `/api/v1/crr/training/:id` | authenticated | Update status / due date |
| POST | `/api/v1/crr/training/:id/complete` | authenticated | Mark complete + attestation |

## UI

- **Control → AML Training** — completion KPIs, filter (all / mine / overdue), register table
- **Assign training** — MLRO only (assign form)
- **Start / Complete** — per-record actions; completion writes attested-by email
- Link to **Audit Log** for examiner trail

## Verify

```bash
# Stats (any authenticated user)
curl http://localhost:3010/api/v1/crr/training/stats \
  -H "Authorization: Bearer dev:tayel.mohamed@mal.ae:MLRO,Reviewer"

# Assign course (Reviewer/MLRO)
curl -X POST http://localhost:3010/api/v1/crr/training \
  -H "Authorization: Bearer dev:tayel.mohamed@mal.ae:MLRO,Reviewer" \
  -H "Content-Type: application/json" \
  -d '{"userEmail":"david.henry@mal.ae","courseId":"AML-FCC-101"}'
```

## Tests

```bash
npm test -- training-records
```

## Next (Phase 1 remaining)

- ~~OIDC auth~~ — see `30-OIDC-AUTH-PHASE1.md`
- ~~FFIEC examination matrix tracker~~ — see `31-FFIEC-EXAMINATION-MATRIX.md`

**Phase 1 complete.** Phase 2: goAML API submission · exam-pack export.
