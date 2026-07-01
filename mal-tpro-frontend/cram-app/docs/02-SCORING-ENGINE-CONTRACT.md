# 02 — Scoring Engine Contract (authoritative)

This is the exact behaviour `@cram/engine` must implement. It consolidates the
master BRD §2.5 / §6 / §7 with the methodology and technical skills. **Read this
before writing any engine code.** Cite section numbers in comments.

## 0. Inputs and outputs (pure function)
```
score(input, config) -> result      // no I/O, no clock, deterministic
```
`input`: segment, lifecycle, screening_results, pep_type, parameter inputs
(Low/Medium/High per param), and any analyst-asserted OVR Yes/No flags.
`config`: the active model-version snapshot — factor weights, parameter weights +
mandatory flags, band boundary set, OVR library (class/priority/active/auto), and
the reference-data versions used to derive parameter scores upstream.
`result`: see §7.

Use **decimal** arithmetic throughout. Never compare floats to band boundaries.

## 1. Section structure (A–H) the engine serves
A Assessment details · B Pre-screening (hard stops) · C Factor weights ·
D Parameter scoring · E Raw composite + math rating · F Override/floor checks ·
G Final rating + outcomes · H Manual override. (master BRD §2.4)

## 2. Pre-screening & hard stops (Section B) — master BRD §2.5.1
Each screening line result ∈ {Clear, Potential Match, True Match, False Positive, Pending}.
```
screeningScore = True Match -> 3
                 Potential Match | Pending -> 2
                 Clear | False Positive -> 1
```
- `Sanctions/TFS = True Match` OR `Internal Watchlist = True Match` → **HARD STOP → PROHIBITED**. Do not proceed.
- `PEP = True Match` → read **pep_type**: Foreign/IO PEP → HIGH floor (OVR-008); Domestic PEP → MEDIUM floor (OVR-016). `pep_type` is a mandatory explicit input.
- `Adverse Media = True Match` → HIGH floor (OVR-009); Potential = "Review".
- Sanctions **Category A** country nexus (Iran, North Korea, Syria) → no account / prohibition (see `sanctions_programme.json`).

## 3. Parameter & factor scoring (Section D) — master BRD §2.5.2–2.5.4
```
paramScore   = Low->1, Medium->2, High->3                 // blank if not scored
weightedContribution = paramScore * intra_factor_weight    // blank if paramScore blank
factorScore  = Σ(weightedContribution of scored params) / Σ(weights of scored params)   // 1..3
factorContribution = factorScore * factor_weight
```
**Re-normalisation rule:** the denominator sums only the weights of parameters that
were actually scored, so a partially-scored *optional* factor still normalises onto
1–3. Mandatory parameters are never blank — a missing mandatory parameter BLOCKS.

## 4. Raw composite & mathematical rating (Section E) — master BRD §2.5.5
```
rawComposite = Σ factorContribution over all factors   // blanks treated as 0
```
Map with the **parameterised band boundary** (see §6). Store rawComposite to ≥4 decimals.

## 5. Override floor result (Section F) — master BRD §2.5.6 / §7.3
Evaluate OVR rules → each `triggered? = YES/No`. Auto-evaluate OVR-001 (sanctions),
OVR-008 (PEP), OVR-009 (adverse media) from Section B; the rest are analyst-asserted
with evidence. Then:
```
overrideFloor = any PROHIBITED-class triggered -> "PROHIBITED"
              : any HIGH-class triggered       -> "High"
              : any MEDIUM-class triggered     -> "Medium"
              : "No Floor Triggered"
```
Per-segment OVR subsets (master BRD §7.3.3):
- **NP (New & Existing):** 001, 002, 003, 008, 009, 011, 013, 015, 016, 017, 018.
- **LP/SME/Merchant:** 001, 004, 005, 006, 008, 009, 011, 012, 016, 017, 019.
Prohibition set that short-circuits to PROHIBITED (master BRD §7.3.1): sanctions or
internal-watchlist true match; OVR-001/002/003/005/006/007; nature-of-business
score = 4; country firm-override = Prohibited (4); Category A nexus.
**EDD consequence:** any PEP score > 0 forces at least EDD even if rating < High.

## 6. Band boundary — PARAMETERISED (master BRD §1.3, §7.2.1) — CRITICAL
The two source engines disagree:
| Band | Calculator boundary | CRAM-engine boundary |
|---|---|---|
| Low | ≤ 1.5000 | 0.00 – 1.00 |
| Medium | 1.5001 – 2.1500 | 1.01 – 2.00 |
| High | > 2.1500 | 2.01 – 3.00 |

A composite of 2.10 is **Medium** under the Calculator but **High** under CRAM.
→ The boundary set is **configuration per segment per model version**, selected
from `band_boundaries`, defaulted and approved by the MLRO. **The boundary set
used MUST be recorded in the assessment audit block** so results are reproducible
and explainable. Do not hard-code either boundary. Default to the Calculator set
unless the MLRO ratifies otherwise (see open items).

## 7. Final rating, outcomes & result object — master BRD §2.5.7 / §7.2
```
finalRating = MOST_RESTRICTIVE(
    HardStop|Prohibition ? "PROHIBITED" : none,
    overrideFloor == "High"   || mathBand == "High"   ? "HIGH"   : none,
    overrideFloor == "Medium" || mathBand == "Medium" ? "MEDIUM" : none,
    mathBand == "Low" ? "LOW" : none
)   // if no factor scored and no override -> "INCOMPLETE — score all factors"
Precedence (high→low): HardStop/Prohibited > High(override) > math band.
```
Final rating deterministically drives four outcomes (master BRD §2.5.7):

| Outcome | PROHIBITED | HIGH | MEDIUM | LOW |
|---|---|---|---|---|
| CDD/EDD | No relationship / restricted handling | EDD (SoF/SoW, adverse-media, enhanced sanctions/PEP, risk acceptance) | Standard CDD + targeted info | Standard CDD (SDD where lawful) |
| Approval | Compliance/MLRO/Legal + governance | Head of Compliance/MLRO; senior mgmt/Board for PEP/correspondent | Operations/Compliance per driver | Automated/Operations/business delegated |
| Review | N/A (reject/exit/freeze) | Max 12 months (6 for very-high-risk PEP/digital-fraud/correspondent) | Max 24 months | Max 36 months |
| Monitoring | Block/freeze/reject/exit & report | Enhanced, lower thresholds, periodic adverse media, restrictions | Moderate + selected enhanced | Standard + baseline digital |

`next_review_date = EDATE(reviewDate, reviewMonths)` (master BRD §7.4).

**Result object (return all of this — explainability is mandatory):**
```json
{
  "composite_score": "1.8750",
  "math_band": "Medium",
  "band_boundary_set": "calculator",
  "factor_scores": [{"factor":"...","score":"...","contribution":"..."}],
  "parameter_scores": [{"factor":"...","param":"...","input":"High","score":3,"weight":"..."}],
  "override_results": [{"rule_id":"OVR-008","class":"HIGH","triggered":true,"reason":"Foreign PEP true match"}],
  "override_floor": "High",
  "final_rating": "High",
  "outcomes": {"cdd_tier":"EDD","approval_authority":"MLRO","review_months":12,"monitoring":"Enhanced"},
  "blocked_parameters": [],
  "model_version_id": "CRAM-CBUAE-2026-05-FREEZE-01",
  "reference_versions": {"country":"...","profession":"...","nob":"..."}
}
```

## 8. Country sub-model (feeds the Geography factor) — master BRD §6.6
```
overallCountry = FATF*0.30 + Basel*0.35 + Sanctions*0.30 + SafeHaven*0.05
firmScore      = FirmOverride=="Prohibited" ? 4 : FirmOverride=="FATF Grey List" ? 3 : overallCountry
```
The engine consumes **firmScore** (column already provided in `country_risk.csv`).
Score each country attribute (residence, birth, nationality, SoW) and take the
configured aggregation (highest-risk by default). A firmScore of 4 is a prohibition.

## 8A. Activity / profession sub-model (ISIC Rev. 5) — see `docs/06`
The **business-activity** (LP/MER) and **profession** (NP) parameters of the
Customer-Type / Profile factor are scored via the official ISIC Rev. 5 → AML
mapping. Resolve the declared activity to an ISIC code (provided code → typology
lookup → title match → legacy nature-of-business → theme fallback), take the
mapping's rule-adjusted base score (1–3), then `max()` with any matched keyword/
typology rule from `isic_rule_library.json`. Profession uses `profession.csv`
max'd with `isic_profession_guidance.csv`. **Prohibition (score 4)** is the policy
layer (CRAM prohibited activities, restricted goods, Category-A nexus) handled in
the override step, never averaged. ISIC ratings are **inherent industry risk
only** — one parameter, not the final rating. Full logic, files and explainability
fields are in **`docs/06-ACTIVITY-RISK-ISIC.md`**.

## 9. Product sub-model — master BRD §6.7
Product overall = equal-weighted average of 9 criteria (each 1/9), bands Low 0–1 /
Medium 1.01–2 / High 2.01–3. With multiple products, use the **highest** product
score unless an approved exposure-weighted method is configured.

## 10. Things the engine must NEVER do
- Round before a threshold comparison. - Default a missing mandatory input to Low.
- Let a Low/Medium math band lower a triggered floor. - Hard-code a weight, score
  or boundary. - Resolve an open item silently (§docs/05).
