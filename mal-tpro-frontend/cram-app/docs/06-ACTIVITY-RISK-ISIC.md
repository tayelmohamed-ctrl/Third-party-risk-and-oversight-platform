# 06 — Activity / Business-Line Risk (ISIC Rev. 5)

This document defines how the **business-activity** (LP/MER) and **profession**
(NP) inputs are scored, using the official **ISIC Rev. 5 → AML risk mapping**. It
sits under the Customer-Type / Profile factor of the scoring engine (master BRD
§6.5) and does **not** by itself set the final rating — it produces one parameter
score that then flows through the normal pipeline (weights → composite →
overrides → non-dilution). ISIC ratings are **inherent industry risk only**;
final customer risk still depends on geography, product, channel, transactions
and screening.

## 1. What the ISIC mapping gives us
Seed files in `seed/data/` (extracted from `Comprehensive_ISIC_Rev5_AML_Risk_Mapping.xlsx`):

| File | Rows | Role |
|---|---|---|
| `isic_aml_mapping.csv` | 830 | **Canonical activity library.** Every official ISIC Rev. 5 Section/Division/Group/Class with AML rating (Low/Medium/High), score (1/2/3), risk theme, primary risk drivers, suggested CDD/EDD, suggested controls, the rule_id that set the rating, and the source URL. Ratings are already **rule-adjusted** per code. |
| `isic_rule_library.json` | 18 | **Keyword/typology rules** (VH/H/MH/LOW) with regex triggers, used to classify free-text activity and to uplift ratings. |
| `isic_activity_lookup.csv` | 6 | **Typology shortcuts** for hard-to-classify high-risk activities (MSB, precious-metals dealers, casinos, auto dealers, crypto services, convenience retail) → the correct ISIC code(s). |
| `isic_risk_themes.csv` | 12 | Thematic clusters (financial, real estate, gatekeepers, gambling, etc.) with indicative ISIC prefixes — for reporting and for a coarse fallback. |
| `isic_profession_guidance.csv` | 16 | High-level **profession/occupation** risk profiles for NP (gatekeepers, dealers, PEPs, etc.). |
| `isic_risk_legend.csv` | 3 | The Low/Medium/High legend: score, CDD level, meaning, minimum control expectations. |

Rating scale: ISIC uses **1 = Low, 2 = Medium, 3 = High**. (There is no inherent
score 4 in ISIC; **prohibition (score 4)** comes from the CRAM policy layer — see §4.)

## 2. Business-activity resolution & scoring (LP / MER)
Implement as a deterministic resolver that returns `{score, isic_code, level,
rating, theme, drivers, cdd_edd, controls, matched_rules[], basis}` for explainability.

```
resolveActivity(declaredActivityText, providedIsicCode?, declaredGoods?) -> ActivityScore
```

**Resolution order (first hit wins for the code; scoring then layers on top):**
1. **Provided ISIC code** → look up `isic_aml_mapping` at the most specific level
   (Class > Group > Division > Section). If only a parent level exists, use it and
   record the level used.
2. **Typology shortcut** → match `declaredActivityText` against
   `isic_activity_lookup` (MSB, crypto, casinos, precious metals, auto dealers,
   convenience retail). These resolve known high-risk typologies to the correct
   ISIC code and rating even when the customer self-describes vaguely.
3. **Title match** → match `declaredActivityText` to an `isic_aml_mapping`
   `activity_title` (exact, then fuzzy/contains).
4. **Legacy nature-of-business** → fall back to `nature_of_business.csv` (the 169
   CRAM activities). This is also where **prohibition (score 4)** lives.
5. **Theme fallback** → if still unresolved, map to a cluster in
   `isic_risk_themes` and use its indicative rating, and **flag for manual ISIC
   classification** (data-quality task) — do **not** default to Low.

**Scoring (after a code/title is resolved):**
```
baseScore   = mapping.risk_score            // 1..3, already rule-adjusted for known codes
ruleScore   = max score over isic_rule_library rules whose regex matches
              (declaredActivityText + resolved activity_title + declaredGoods)
activityScore = max(baseScore, ruleScore)   // typology uplift can raise, never lower
```
Record every matched `rule_id` and the `basis` ("ISIC class 6419", "rule H01
banking", "typology lookup: MSB") in the result for audit/explainability.

The resulting `activityScore` (1–3) is the **business-activity parameter** inside
the Customer-Type / Profile factor (intra-factor weight per the parameter table;
master BRD §6.5 holds nature-of-business at 20% of Customer Type Risk).

## 3. Profession resolution & scoring (NP)
```
resolveProfession(declaredProfession) -> ProfessionScore
```
1. Look up `profession.csv` (736 professions) → score 1–3.
2. Cross-check `isic_profession_guidance.csv` (gatekeepers, dealers, casino/MSB/
   crypto owners, public officials, NPO officers, etc.). If the guidance rates the
   profile **High**, take `max(professionScore, 3)` and attach the rationale.
3. Apply profession-relevant `isic_rule_library` triggers (e.g. lawyer/notary →
   H05 gatekeeper; gold dealer → H04). Take the max.
4. Unmapped profession → at least **Medium** pending mapping (never Low) +
   remediation task.
The result is the **profession parameter** (20% of Customer Type Risk; master BRD §6.5).

## 4. Prohibition layer (score 4) — keep separate from ISIC
ISIC inherent risk tops out at 3. **Prohibition (score 4 → PROHIBITED)** is a
policy/legal layer evaluated in the override/prohibition step, not by averaging:
- `nature_of_business.csv` activities with score **4** (the CRAM prohibited
  activities) → prohibition (master BRD §6.3.11 / §7.3.1).
- Arms/defence/dual-use and restricted goods (ISIC rule **VH02**) → at minimum
  High + sanctions/export-control screening; prohibition where appetite/sanctions
  require (link to Category C restricted goods in `sanctions_programme.json`).
- Activity tied to a Category A sanctioned-country nexus → prohibition.
A score-4 activity short-circuits to PROHIBITED exactly like any other hard stop —
it is never diluted by the weighted maths (contract §5, §7).

## 5. Scale normalisation (open item #6)
All activity/profession inputs are normalised onto the internal **1–3** scale
before weighting. `0` = not applicable (excluded from the factor average; the
factor re-normalises on scored parameters, contract §3). `4` = prohibition **flag**
(handled in the override step, never averaged). This is consistent with the
existing engine contract — no special-casing inside the weighted maths.

## 6. Outputs the engine must expose (explainability)
For every assessment, the audit block records, for the activity and profession
parameters: the **declared input**, the **resolved ISIC code + level + title**,
the **base score**, any **matched rule_ids** and their themes, the **final
parameter score**, the **CDD/EDD level and suggested controls** from the mapping,
and the **source URL**. This lets the MLRO and CBUAE see exactly why an activity
scored as it did and which official ISIC entry and typology rule drove it.

## 7. Governance
- The ISIC mapping, rule library and lookups are **versioned reference data**
  (maker-checker), bound to the model version like every other library
  (`docs/03-REFERENCE-DATA-GUIDE.md`). Bump `library_version` on any change.
- ISIC ratings are **inherent industry risk only** (per the workbook README):
  surface them as one driver; never let them substitute for geography, product,
  channel, transaction or screening risk.
- New/unmapped activities create a remediation task and are reviewed against the
  official ISIC Rev. 5 source (URLs are carried in the seed data).
