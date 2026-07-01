# Theme 3 — Override governance

Closes the gap: **logic yes, enforcement no** for manual MLRO overrides/downgrades.

## Enforcement stack

| Layer | Control |
|-------|---------|
| **Engine** | `scoreCustomer` — non-dilution: override ≥ floor, no lift of Prohibited |
| **API RBAC** | `override` capability (MLRO only) when `input.manualOverride` is set |
| **Server re-score** | `governAssessmentSubmission` re-computes rating; rejects tampered payloads |
| **Justification** | Min 20 chars · `override_justification` column + `governance` JSON on assessment |
| **Immutable audit** | `override.applied` entry in append-only `audit_log` |

## Dev personas (Risk Test Bench)

Switch **Signed-in persona** on the Test Bench:

- **Analyst** — can submit scores; override blocked (403 from API)
- **MLRO** — can submit overrides with mandatory justification

Tokens: `Bearer dev:mlro@mal.ae:MLRO` / `Bearer dev:analyst@mal.ae:Analyst`

## API

- `GET /api/v1/crr/auth/me` — current user + capabilities
- `POST /api/v1/crr/assessments` — governed submit (body may include `overrideJustification`)

## Files

- `server/overrideGovernance.ts`
- `src/lib/authSession.ts`
- `src/components/Theme3Status.tsx`
