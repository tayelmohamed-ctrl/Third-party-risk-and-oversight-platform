# Seed data

Reference libraries extracted directly from the master BRD appendices. Load these
as model version `CRAM-CBUAE-2026-05-FREEZE-01` (draft). All are versioned config —
route any change through maker-checker.

| File | Rows | Source appendix |
|---|---|---|
| `data/country_risk.csv` | 251 | B — Country Risk Library |
| `data/profession.csv` | 736 | D — Profession Library |
| `data/nature_of_business.csv` | 169 | C — Nature-of-Business Library |
| `data/override_rules.csv` | 20 | A / Part 5.3 — OVR library |
| `data/factor_weights.csv` | 6 | Part 5.2 — factor weights |
| `data/product_baseline.csv` | 12 | Part 5.4 — product baseline |
| `data/sanctions_programme.json` | 3 cats + 25 safe-haven | E — Sanctions Programme (2023) |
| `data/isic_aml_mapping.csv` | 830 | ISIC Rev. 5 AML Risk Mapping (official) |
| `data/isic_rule_library.json` | 18 | ISIC Rule Library (keyword/regex typology rules) |
| `data/isic_activity_lookup.csv` | 6 | High-risk typology activities → ISIC code |
| `data/isic_risk_themes.csv` | 12 | ISIC risk themes / clusters |
| `data/isic_profession_guidance.csv` | 16 | Profession/occupation AML guidance |
| `data/isic_risk_legend.csv` | 3 | ISIC AML risk legend |

`schema/` holds JSON Schemas for validation on load.

## Re-extracting after a source update
1. `pandoc Customer_Risk_Assessment_BRD_Master.docx -o master.html`
2. `python` + `pandas.read_html('master.html')` — the appendix tables are the large
   ones (country = 251 rows × 8 cols; nature-of-business and profession come as two
   item/score pairs per row and must be unstacked; sanctions = 3-row category table).
3. Diff against the current CSVs; route changes through maker-checker; bump the
   `library_version`.

## Activity (ISIC) data
The `isic_*` files come from `Comprehensive_ISIC_Rev5_AML_Risk_Mapping.xlsx` and drive the business-activity (LP/MER) and profession (NP) parameters. Resolution and scoring logic is in `docs/06-ACTIVITY-RISK-ISIC.md`. ISIC ratings are inherent industry risk only; scores are 1=Low/2=Medium/3=High (prohibition score 4 comes from the CRAM policy layer, not ISIC).

## Notes
- `country_risk.csv` `firm_score` is the value the engine consumes (defaults to
  `overall` unless a firm override sets Prohibited→4 or FATF Grey List→3).
- `nature_of_business.csv` score 4 = prohibition.
- `override_rules.csv` needs derived columns added on load: `class`
  (PROHIBITED/HIGH/MEDIUM), `active_flag` (OVR-001..007 = LOCKED), `auto_evaluated`
  (OVR-001/008/009 = true), `segment_applicability` (see contract §5).
