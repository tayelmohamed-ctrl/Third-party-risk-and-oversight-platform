# Theme 2 — Risk factor completeness

Aligns CRAM scoring with **Mal Bank AML/CFT Policy §12.2, §12.5, §12.6** and **Digital Onboarding Procedures §2, §10**.

## What was fixed

| Gap | Before | After |
|-----|--------|-------|
| **UBO / beneficial ownership** | OVR-004 in rule library only | `legalForm`, `uboStatus`, `uboLayers` drive customer-type score; OVR-004 fires on refused or incomplete verification |
| **Expected vs actual activity** | Single self-declared “avg txn/month” band used for both customer-type and transaction factors | `expectedMonthlyBand` (onboarding declaration) vs `actualMonthlyBand` (TM rolling observed); deviation scored in transaction factor |

## Engine files

- `src/engine/activityProfile.ts` — UBO score, activity deviation helpers
- `src/engine/normalizeInput.ts` — backward-compat for legacy snapshots
- `src/engine/cram.ts` — six-factor model + OVR-004 + profile notes
- `src/engine/rerating.ts` — `OWNERSHIP_CHANGE` / `TRANSACTION_ANOMALY` mutate UBO and actual bands

## UI

- **Risk Test Bench** — separate Expected (onboarding) and Observed (TM) activity bands; UBO fields for legal persons
- **Executive Dashboard** — `Theme2Status` panel shows **Strong & complete**

## Policy mapping

- **§12.2 Beneficial ownership** — 25%+ threshold, complex structures, refusal → OVR-004 HIGH
- **§12.5 Expected activity profile** — frequency, volume, value captured as `expectedMonthlyBand`
- **§12.6 Inconsistency** — `activityDeviationScore` uplifts transaction factor; material exceedance adds Compliance escalation note
