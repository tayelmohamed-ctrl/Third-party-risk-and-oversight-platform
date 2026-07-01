# 03 — Reference Data Guide

The reference libraries are the lookup data that turn raw customer attributes into
parameter scores. They are **already extracted** for you in `seed/data/` (parsed
from the master BRD appendices). Load them as model version `CRAM-CBUAE-2026-05-FREEZE-01`
(draft) at Phase 1. Treat all of them as **versioned config**, maker-checked.

## Files in `seed/data/`
| File | Rows | Used by | Notes |
|---|---|---|---|
| `country_risk.csv` | 251 | Geography factor | Columns: country, fatf, basel, sanctions, safe_haven, overall, band, **firm_score** (engine consumes firm_score). |
| `profession.csv` | 736 | NP Customer-Type factor | profession, score (1–3). Default to BLOCK/Medium if unmapped (no default-to-Low). |
| `nature_of_business.csv` | 169 | LP Customer-Type factor | activity, score (1–4). **Score 4 = prohibition.** |
| `product_baseline.csv` | 12 | Product factor | product/service, baseline, drivers, treatment, high-trigger. |
| `override_rules.csv` | 20 | Override engine | rule_id, trigger, outcome, priority, evidence. Add `class` + `active_flag` + `auto_evaluated` + `segment_applicability` columns on load (see contract §5). **OVR-001..007 active_flag = LOCKED.** |
| `factor_weights.csv` | 6 | Composite | factor × {np_new, np_existing, lp_mer_new, lp_mer_existing}. Includes a TOTAL row (=100%) for validation. |
| `sanctions_programme.json` | 3 cats + 25 safe-haven | Prohibition / country model | Category A=no account, B=no USD/EUR/GBP, C=restricted dealings. |
| `isic_aml_mapping.csv` | 830 | **Business-activity factor (canonical)** | Official ISIC Rev. 5 Section/Division/Group/Class → AML rating, score (1–3, rule-adjusted), theme, drivers, CDD/EDD, controls, rule_id, source. See `docs/06`. |
| `isic_rule_library.json` | 18 | Activity typology uplift | Keyword/regex rules (VH/H/MH/LOW) → rating + theme + controls. |
| `isic_activity_lookup.csv` | 6 | Activity typology shortcuts | MSB, precious metals, casinos, auto dealers, crypto, convenience retail → ISIC code(s). |
| `isic_risk_themes.csv` | 12 | Reporting / coarse fallback | Activity clusters → indicative ISIC prefixes + risk. |
| `isic_profession_guidance.csv` | 16 | NP profession factor | High-level profession risk profiles (gatekeepers, dealers, PEPs, etc.). |
| `isic_risk_legend.csv` | 3 | Legend | Low/Medium/High → score, CDD level, minimum controls. |

## Country model (master BRD §6.6)
`overall = FATF*0.30 + Basel*0.35 + Sanctions*0.30 + SafeHaven*0.05`; the engine
uses the `firm_score` column (defaults to overall unless a firm override sets
Prohibited→4 or FATF Grey List→3). FATF/Basel come from their source tables; the
component scores are pre-computed in the CSV. Ranking bands: Low 0–1, Medium
1.01–2, High 2.01–3.

## Activity model (ISIC Rev. 5) — see `docs/06`
The business-activity (LP/MER) and profession (NP) parameters are scored from the
official **ISIC Rev. 5 → AML mapping** (`isic_aml_mapping.csv`, 830 entries) plus
the keyword/typology `isic_rule_library.json` and the `isic_activity_lookup.csv`
shortcuts. The engine resolves a declared activity to an ISIC code, takes the
rule-adjusted base score (1–3), and `max()`-es it with any matched typology rule.
The legacy `nature_of_business.csv` (169 rows) remains the **prohibition (score 4)**
source and a fallback for unmapped activities. Full resolution and scoring logic
is in `docs/06-ACTIVITY-RISK-ISIC.md`. ISIC ratings are **inherent industry risk
only** — one parameter, never the final rating.

## Loading rules
- Each library row carries a `library_version`; every assessment records the
  versions it used (reproducibility).
- Validate on load: `factor_weights` columns each sum to 100%; intra-factor
  parameter weights defined; OVR-001..007 locked; country `firm_score` present.
- Unmapped lookups (profession/activity/country/product not found) → **do not
  default to Low**. Apply the data-quality rule: at least Medium pending mapping,
  High if other risk indicators exist, and raise a remediation task.

## Extending beyond NP/LP
FI/MER/EMP/EXT parameter libraries are defined qualitatively in the methodology
skill (`docs/knowledge/cram-risk-methodology/references/parameter-libraries.md`).
When you build those segments (Phase 3+), add their parameter/weight rows to the
same `parameters` / `factor_weights` tables under the same model version — the
engine does not change.

## Re-extracting from source (if the appendices change)
The seed files were parsed from `Customer_Risk_Assessment_BRD_Master`. To
regenerate after a source update: convert the docx to HTML and parse the appendix
tables (Country, Nature-of-Business, Profession, Sanctions) — see `seed/README.md`
for the exact method. Always diff against the previous version and route changes
through maker-checker.
