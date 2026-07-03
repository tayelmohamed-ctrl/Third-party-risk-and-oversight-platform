# 32 — Phase 2: goAML Submission & Exam Pack Export

Phase 2 connects MLRO-approved filing drafts to FIU systems and delivers CBUAE examination pack generation.

## goAML / FinCEN submission

```
MLRO-approved draft → compliance check → payload builder → FIU adapter (mock/live)
        ↓
FilingSubmission record + draft status → submitted
        ↓
Audit: filing.fiu.submitted · FIU reference stored
```

### Modes

| Env | Behaviour |
|-----|-----------|
| `GOAML_MODE=mock` (default) | Accepts payload, returns `UAE-FIU-*` reference |
| `GOAML_MODE=live` | POST to `GOAML_API_BASE` with `GOAML_API_KEY` |
| `FINCEN_MODE=mock` / `live` | Same pattern for US SAR Form 111 |

### API

| Method | Path | Capability | Purpose |
|--------|------|------------|---------|
| POST | `/api/v1/crr/filings/:id/submit-fiu` | `approve_high` | Submit MLRO-approved draft |
| GET | `/api/v1/crr/filings/:id/submissions` | authenticated | Submission history |

### UI

Reporting Centre → Filing drafts → **Submit to FIU (goAML / FinCEN)** when status is `mlro_approved`.

Requires compliance map clear (no blockers) before submission.

## CBUAE examination pack

Target: **25 customers in < 2 hours** (build spec RPT-008).

```
GET/POST /exam-pack → sample latest CRAM assessments
        ↓
Enrich with cases · filings · audit counts · checklist per customer
        ↓
ExamPackRun persisted + audit: exam_pack.generated
```

### API

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/v1/crr/exam-pack?sample=25` | Generate pack |
| POST | `/api/v1/crr/exam-pack/generate` | Generate with body `{ sampleSize }` |
| GET | `/api/v1/crr/exam-pack/runs` | List prior runs |

### UI

**Operate → Examination Pack** (`/exam-pack`) — generate, view sample table, copy JSON.

## Verify

```bash
# Submit MLRO-approved draft (mock goAML)
curl -X POST http://localhost:3010/api/v1/crr/filings/{id}/submit-fiu \
  -H "Authorization: Bearer dev:tayel.mohamed@mal.ae:MLRO,Reviewer"

# Generate 25-customer exam pack
curl -X POST http://localhost:3010/api/v1/crr/exam-pack/generate \
  -H "Authorization: Bearer dev:tayel.mohamed@mal.ae:MLRO,Reviewer" \
  -H "Content-Type: application/json" \
  -d '{"sampleSize":25}'
```

## Tests

```bash
npm test -- phase2-goaml-exam-pack
```

## Next (Phase 3)

- Live goAML credentials and sandbox certification
- PDF/ZIP exam pack export bundle
- OIDC m2m for feed service account
