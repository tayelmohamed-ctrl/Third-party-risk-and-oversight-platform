# 17 — KYC Data Quality Gate (Theme 7)

FR-007 / methodology §15.3: missing mandatory inputs → **BLOCKED**. No silent defaults to Low.

## Module

`src/engine/dataQualityGate.ts`

- `validateDataQuality(capture, kycContext)` — completeness, verification, freshness
- `scoreWithDataQualityGate(...)` — returns `{ ready: false, verdict }` or scored result
- `captureToScoreInput(capture)` — builds `ScoreInput` only after gate passes

## Checks

| Category | Examples |
|---|---|
| Completeness | customer ID, geography, PEP, product, activity bands, screening results |
| Verification | identity verified, liveness, screening completed timestamp |
| Freshness | document issue date ≤10y, KYC refresh ≤36mo (existing) |

## Enforcement

- **Test bench** — section 00 · KYC data quality; BLOCKED panel when gate fails; submit disabled
- **API** — `POST /assessments` with `capture` + `kycContext` returns `422 data_quality_blocked`
- **GV-19** — automated in `tests/data-quality.test.ts` and golden vector pack

## Demo

Enable **Simulate incomplete capture** on the test bench to reproduce GV-19 (clears customer ID and expected activity band).

## Dashboard

`Theme6Status` — **Strong & complete** for bad-input / data-quality theme.
