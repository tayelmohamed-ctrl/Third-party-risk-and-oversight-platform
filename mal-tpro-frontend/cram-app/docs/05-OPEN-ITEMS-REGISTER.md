# 05 — Open Items Register (MLRO must ratify before production freeze)

These reconciliation items come straight from the master BRD §7.5. The model
reference `CRAM-CBUAE-2026-05-FREEZE-01` stays a **draft freeze** until each is
dispositioned (corrected / confirmed-as-intended / parameterised) and logged with
approver + date. The build must **surface** these, not silently resolve them.

| # | Item | Where | Impact | Disposition needed (MLRO decision) | Build handling until decided |
|---|---|---|---|---|---|
| 1 | Medium/High band boundary differs: Calculator 2.1500 vs CRAM 2.00 | contract §6 / BRD §7.2.1 | Same score → different rating | **Ratify one boundary per segment**; record in `band_boundaries` config | Boundary is config; default = Calculator; audit records the set used (run dual in tests) |
| 2 | Nationality/Birth prohibition tests score ≥ 5 but country scale maxes at 4 → branch never fires | BRD §6.3.11 / §7.3.1 | Intended prohibition unreachable | Correct threshold to ≥ 4 (or extend scale); confirm intent | Keep the test, flag it as unreachable in the result/audit; do not drop it |
| 3 | CR Safe-Haven source had `#VALUE!` errors | BRD §7.5 | 5% safe-haven component may misread | Clean source; validate each affected country's safe-haven = 3 | Safe-haven scores in `country_risk.csv` reflect the consolidated values; re-validate on next library load |
| 4 | PEP-type helper (Foreign vs Domestic vs IO) must be an explicit input | BRD OVR-008 / §7.5 | Override may not fire if blank | Make PEP type a mandatory dropdown feeding OVR-008/016 | Engine requires `pep_type` whenever PEP screening present; blank → BLOCKED |
| 5 | CRAM engine quantified for Individual (NP) only; LP params defined qualitatively | BRD §7.5 | LP scoring not yet fully quantitative | Extend LP libraries to quantitative params | Build NP first; LP uses the qualitative parameter set from the methodology skill until quantified |
| 6 | Scale base differs (Calculator 1–3 vs CRAM 0–3/0–4) | BRD §7.5 | Aggregation must normalise | Normalise to a single internal scale before weighting | Engine normalises all inputs to the 1–3 internal scale; 0=N/A and 4=prohibition handled as flags, not averaged |

## How the tool exposes these
- A **Model Governance** screen lists every open item with status (Open / Accepted /
  Corrected), the decision, approver and date — bound to the model version.
- A model version cannot be promoted **draft → frozen** while any item is Open
  (NFR-4). Promotion requires MLRO sign-off and writes an audit record.
- Each assessment's audit block records the boundary set and library versions used,
  so historical results stay reproducible even after an item is dispositioned and a
  new model version is issued.

## Suggested default decisions (for MLRO review — not pre-approved)
These are sensible defaults the MLRO can accept or change; nothing here is binding.
1. Adopt the **Calculator** boundary (Low ≤1.5, Medium ≤2.15, High >2.15) bank-wide
   for consistency with the BRD outcome tables; revisit per segment if calibration
   suggests otherwise.
2. Correct item #2 to **≥ 4** so the nationality/birth prohibition fires at the top
   of the country scale.
3. Make `pep_type` mandatory whenever PEP screening is present (item #4).
