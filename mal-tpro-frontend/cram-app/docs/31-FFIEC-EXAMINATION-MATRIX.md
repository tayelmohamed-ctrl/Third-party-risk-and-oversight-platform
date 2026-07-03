# 31 — FFIEC Examination Matrix (Phase 1 Step 4b)

Live **examination readiness tracker** mapping FFIEC BSA/AML Manual procedures to platform evidence — replaces the illustrative dashboard compliance KPI.

## Flow

```
Bootstrap → seedExaminationIfEmpty() (17 procedures across 9 domains)
        ↓
Live probes refresh from training · cases · filings · validation
        ↓
FFIEC Examination page (/examination) — matrix · domain scores · manual override
        ↓
Dashboard KPI — live readinessScore/100
        ↓
Audit: examination.updated · examination.seed
```

## Domains

Program · Internal Controls · Independent Audit · Training · CDD · SAR · Sanctions · TM · Recordkeeping

Source: `src/config/ffiecExaminationMatrix.ts`

## REST API

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/v1/crr/examination/readiness` | Aggregate score + domain breakdown |
| GET | `/api/v1/crr/examination/items` | Matrix rows (`?domainId=&status=`) |
| POST | `/api/v1/crr/examination/refresh` | Re-run live probes |
| PATCH | `/api/v1/crr/examination/items/:id` | Manual status override (MLRO) |

## Live probes

| Probe | Source | Ready when |
|-------|--------|------------|
| `training` | Training stats | ≥90% completion, 0 overdue |
| `cases` | Investigation store | ≥1 case exists |
| `filings` | Filing drafts | MLRO-approved draft exists |
| `validation` | Model governance | Model frozen |
| `audit` | Audit log | Always available |

## UI

- **Control → FFIEC Examination** — readiness KPIs, domain breakdown, procedure table with evidence links
- **Dashboard** — regulatory compliance score wired live (no longer illustrative when API available)

## Verify

```bash
curl http://localhost:3010/api/v1/crr/examination/readiness \
  -H "Authorization: Bearer dev:tayel.mohamed@mal.ae:MLRO,Reviewer"
```

## Tests

```bash
npm test -- examination-matrix
```

## Phase 1 complete

Steps 1–4 delivered: investigation cases · SAR drafts · training register · OIDC + examination matrix.

**Phase 2+:** goAML API submission · OIDC m2m for feed pipeline · full exam-pack export (25 customers < 2h).
