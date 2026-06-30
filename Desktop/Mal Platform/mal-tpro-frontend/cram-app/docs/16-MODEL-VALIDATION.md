# 16 — Model Validation & Governance (Theme 5)

SR 11-7 / CBUAE model-risk expectations: independent validation, back-testing, outcome analysis, and draft→frozen gates.

## Components

| Layer | Path | Role |
|---|---|---|
| Golden vectors | `src/validation/goldenVectors.ts` | GV-01…39 automated SIT pack |
| Back-test cohort | `src/validation/backtestCohort.ts` | 480-record 18-month synthetic cohort |
| Outcome analysis | `src/validation/backtest.ts` | SAR rate by band, lift, monotonicity |
| Independent validation | `src/validation/independentValidation.ts` | Gates G0–G6, verdict, report |
| Unit tests | `tests/golden-vectors.test.ts` | Vitest — run via `npm test` |
| API | `server/db/validationStore.ts` | Persist runs, promote model |
| UI | `/validation`, `/governance` | Live gate status, outcome tables |

## Gates G0–G6

- **G0** Model freeze — single `model_version_id`, weights sum 100%
- **G1** Data readiness — country/profession/product libraries loaded
- **G2** Vendor readiness — identity resolver + feed pipeline
- **G3** SIT exit — golden vectors ≥85% pass, zero failures
- **G4** UAT exit — pass rate ≥90%
- **G5** Calibration & back-testing — directional sensitivity (High SAR rate ≥2× Low)
- **G6** Production approval — all prior gates pass

## Outcome analysis (Gate 5)

Answers: *does the score predict SARs?*

- Monotonic SAR and adverse-outcome rates across Low / Medium / High
- Lift ratio High vs Low (target ≥2×)
- SAR capture concentration in High band
- Quarterly re-run via `POST /api/v1/crr/validation/run`

## Commands

```bash
npm test                    # golden vectors + back-test + gates
npm run db:migrate          # validation_runs + model_governance tables
```

## Audit trail

- `validation.run` — each independent validation execution
- `model.promoted` — draft → frozen after all gates pass

## Dashboard

`Theme5Status` on Executive Dashboard shows **Strong & complete** for Theme 5.
