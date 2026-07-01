# 18 — ISIC Activity Risk Register (Individual & Entity)

Business-activity ISIC Rev.5 risk scoring is implemented for **both** natural persons (NP) and legal persons (LP/MER).

## Engine

| Module | Role |
|---|---|
| `src/engine/activityRisk.ts` | Full resolution pipeline + profession resolver |
| `src/config/activityRiskConfig.ts` | Individual vs entity methodology & weights |
| `src/data/isic*.json` | ISIC mapping (830), typology lookup (6), rules (18), guidance (16) |

## Resolution order (both modes)

1. Provided ISIC code → `isic_aml_mapping`
2. Typology shortcut → `isic_activity_lookup` (MSB, casino, crypto, precious metals, auto, convenience)
3. Title match → ISIC library
4. Legacy `nature_of_business.csv` — **prohibition score 4**
5. Theme fallback → `isic_risk_themes` — **never Low**

## Individual (NP)

- **Profession** — `profession.csv` + `isic_profession_guidance.csv` + rule uplift (H05 gatekeeper, etc.)
- **Self-employed activity** — ISIC pipeline when employment score ≥ 2
- Customer-type weights: profession 18%, activity 18%, employment 12%, …

## Entity (LP/MER)

- **Registered business activity** — primary driver (22% of customer-type factor)
- **Entity legal type** — additional 10% weight
- **UBO transparency** — 16% + OVR-004

## UI

- **Test bench** — separate profession (individual) vs ISIC activity (entity); live resolution in score panel
- **ISIC Activity Register** (`/activity-register`) — libraries, config, live resolver preview

## Assessment audit

Every `ScoreResult` includes:

- `activityResolution` — code, basis, matched rules, CDD/EDD, library version
- `professionResolution` — profession score, guidance, remediation flag

See also `docs/06-ACTIVITY-RISK-ISIC.md`.
