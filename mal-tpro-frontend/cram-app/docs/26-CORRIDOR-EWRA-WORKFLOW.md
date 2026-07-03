# Corridor EWRA theme workflow — data intake guide

This document explains **how to feed compliance country module details and corridor-specific risks** into the Mal FinCrime portal so Sayed can implement them under the correct section, category, and agent ownership.

## Where it lives in the portal

| Layer | Location | Agent | Category |
|-------|----------|-------|----------|
| **Board EWRA heat map** | Regulatory Management → Risk heat map | Sayed | Evidence folder 03 · `ewra_regulatory_pack.json` |
| **Corridor EWRA themes** | Regulatory Management → **Corridor EWRA** | Sayed (primary) | Risk heat map addendum · `corridor_ewra_themes.json` |
| **Compliance country modules** | Same tab → Compliance country modules view | Sayed | Extends `country_risk.csv` with EWRA overrides |
| **TM corridor scenarios** | Transaction Monitoring | Mohsen | Oscilar rule library · Cross-border & corridor risk |
| **Board / MI reporting** | Reporting Centre | Jana | `MI-EWRA-001` · country exposure analysis |
| **MLRO sign-off** | Corridor detail → approval block | Walid (human) | Certifies before `live` stage |

**Responsible AI agent:** **Sayed** owns the corridor EWRA workflow end-to-end (scoring, country modules, CRAM mapping). **Mohsen** owns typologies and Oscilar rules once a corridor reaches the **TM scenarios** stage. **Jana** owns board notification via `MI-EWRA-001`.

---

## Three ways to feed data

### Option A — Edit JSON directly (recommended for engineers)

Update these files in the repo:

1. **`src/data/corridor_ewra_themes.json`**
   - `complianceCountryModules[]` — one row per country
   - `corridorThemes[]` — one row per origin→destination corridor

2. **`seed/data/country_risk.csv`** (optional) — if CRA firm scores should change for all customers, not just EWRA

3. **`src/data/oscilar_rule_library.json`** — when Mohsen TM rules are ready

4. **Google Drive** — mirror evidence at paths referenced in `driveDoc` fields (folder 03)

### Option B — Paste a filled intake block in chat

Copy the template below, fill it in, and paste into Cursor chat. Ask: *"Implement this corridor EWRA intake into the portal."*

### Option C — Spreadsheet export

Export two sheets as CSV, then ask to convert:

- **Sheet 1: Country modules** — columns matching `complianceCountryModules`
- **Sheet 2: Corridors** — columns matching `corridorThemes` (typologies as semicolon-separated)

---

## Intake template (paste into chat)

```yaml
# ── COMPLIANCE COUNTRY MODULE ──
countryCode: PK          # ISO 3166-1 alpha-2
countryName: Pakistan
localRegulator: "State Bank of Pakistan · FMU"
fatfStatus: grey_list    # member | grey_list | black_list
sanctionsLists: [UN, UAE_TFS]
craFirmScore: 1.45       # from country_risk.csv today
craBand: Medium
ewraFirmScoreOverride: 2.75   # null if no override
ewraBandOverride: High
overrideRationale: "FATF grey list; hawala typologies on UAE→PK corridor"
eddMandatory: true
enhancedMonitoring: true
localReportingNotes: "STR to UAE FIU; beneficiary bank DD"
reviewCadence: quarterly
driveDoc: "Risk/Country-modules/Pakistan"

# ── CORRIDOR THEME ──
corridorId: COR-AE-PK
label: "UAE → Pakistan"
originCountryCode: AE
destinationCountryCode: PK
productScope: [remittance, account_to_account]
licensePaths: [UAE_COMMUNITY_BANK]
workflowStage: controls_mapped   # see workflow stages below
status: pilot                    # planned | pilot | live | suspended
inherentRisk: High               # Low | Medium | High
controlRating: Partial           # Strong | Partial | Weak
residualRisk: "Medium-High"
mlTypologies: [hawala_parallel, trade_misinvoicing]
tfTypologies: [charitable_front_NGO]
islamicSpecific: [zakat_misuse]
sanctionsNotes: "FATF grey list — no comprehensive sanctions"
controls: [C-101, C-104, C-112]
workflows: [WF-SCREENING, WF-TM-CROSSBORDER]
oscilarRules: [OS-TM-031]
targetGoLive: "2026-Q4"
mlroSignOff: false
driveDoc: "Risk/Heat-maps/Corridors/AE-PK"
```

Repeat the country + corridor blocks for each corridor (PK, EG, TR, ID, BD, PH, etc.).

---

## Workflow stages (in order)

| Stage ID | Label | Agent | Gate |
|----------|-------|-------|------|
| `identified` | Identified | Sayed | Corridor on product roadmap |
| `country_module` | Country module | Sayed | Compliance country module complete |
| `inherent_scored` | Inherent scored | Sayed | High/Medium/Low + typology evidence |
| `controls_mapped` | Controls mapped | Sayed | CRAM controls + workflows linked |
| `tm_live` | TM scenarios | Mohsen | Oscilar rules active |
| `mlro_approved` | MLRO approved | Sayed/Walid | Walid certifies |
| `board_notified` | Board notified | Jana | MI-EWRA-001 or board addendum |
| `live` | Live | Sayed | Production + library version bump |
| `review_due` | Review due | Sayed | Quarterly / event-driven refresh |

---

## Field reference — compliance country module

| Field | Required | Notes |
|-------|----------|-------|
| `countryCode` | Yes | ISO alpha-2 (PK, EG, …) — must match `country_risk.csv` / CRAM |
| `fatfStatus` | Yes | Drives automatic review cadence |
| `craFirmScore` / `craBand` | Yes | Current CRA library values |
| `ewraFirmScoreOverride` | No | Set when enterprise/corridor risk exceeds CRA geography factor |
| `overrideRationale` | Yes if override | Examiner-readable justification |
| `eddMandatory` | Yes | Triggers EDD workflow in onboarding |
| `sanctionsLists` | Yes | UN, UAE_TFS, OFAC, etc. |
| `localRegulator` | Yes | FIU / central bank for correspondent DD |

---

## Field reference — corridor theme

| Field | Required | Notes |
|-------|----------|-------|
| `originCountryCode` / `destinationCountryCode` | Yes | Links to country modules |
| `inherentRisk` | Yes | Enterprise theme rating (not customer CRA) |
| `corridorRisks.*` | Yes | ML, TF, illicit finance, Islamic-specific typologies |
| `controls` / `workflows` | Yes | Must exist in `cram_lineage_catalogue.json` |
| `oscilarRules` | When TM live | IDs from `oscilar_rule_library.json` |
| `heatMapCell` | Yes | Maps to 3×3 EWRA matrix (inherent × control) |
| `approval.targetGoLive` | Yes | Quarter target |
| `approval.cramLibraryVersionOnGoLive` | On live | e.g. `CRAM-CBUAE-2026-08` |

---

## Relationship to other data

```
country_risk.csv (CRA geography factor)
        ↓
complianceCountryModules (EWRA override + EDD flags)
        ↓
corridorThemes (origin→dest inherent risk + typologies)
        ↓
ewra_regulatory_pack.json (board heat map snapshot)
        ↓
MI-EWRA-001 / board pack (Jana)
```

Customer-level CRA uses `firm_score` from `country_risk.csv`. Corridor EWRA uses **enterprise theme units** on the heat map — a corridor can be **High inherent** even when average customer CRA geography is Medium.

---

## Current seed corridors (Q3 2026)

| Corridor | Stage | Inherent | EWRA dest. override |
|----------|-------|----------|---------------------|
| UAE → Pakistan | tm_live | High · **Critical L×I 25** | PK 2.75 High |
| UAE → Egypt | inherent_scored | High | EG 2.5 High |
| UAE → Turkey | country_module | Medium | TR 2.25 Medium |
| UAE → Indonesia | identified | Medium | ID 2.0 Medium |
| UAE → Bangladesh | identified | Medium | BD 2.25 Medium |
| UAE → Philippines | identified | Medium | PH 2.0 Medium |

## Pakistan risk typology library

Full typology corpus ingested from:
- Pakistan NRA 2023 (summarized)
- Mal Compliance Country Module — Pakistan (v0.1)
- GA Partner Oversight Workbook §8

**Portal:** Regulatory Management → Corridor EWRA → **Risk typology library · PK**

Data file: `src/data/pakistan_risk_typology_library.json` · 14 Mal typologies · NRA predicates · red flags · CCM fields

---

## What to send for a new corridor

Minimum viable intake per corridor:

1. **Country module** for destination (and origin if not UAE)
2. **Inherent risk rating** with 2–3 sentence rationale
3. **Typology list** (ML, TF, Islamic-specific if relevant)
4. **Product scope** (remittance, account, card, trade)
5. **Target go-live quarter**
6. **Control IDs** you believe apply (or ask Sayed to propose from CRAM catalogue)
7. **Drive path** for supporting analysis (optional but recommended for exam evidence)

Paste into chat or open a PR editing `corridor_ewra_themes.json`.

---

## Tests

Run: `npm test -- corridor-ewra`

Validates pack structure, workflow stage ordering, and country module ↔ corridor linkage.
