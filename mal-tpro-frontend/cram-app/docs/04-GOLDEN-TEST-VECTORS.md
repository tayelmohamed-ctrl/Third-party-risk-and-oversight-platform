# 04 — Golden Test Vectors

The engine must pass these deterministic cases. They combine the handbook SIT pack
(the 12 mandatory), the methodology validation pack, and the band-boundary
reconciliation. QA tolerance vs manual calculation = **0.0001**. Each case lists
inputs → expected final outcome; encode them as automated tests in `@cram/engine`.

> Where a case depends on the band boundary, run it under **both** boundary sets
> and assert the documented result for each — this protects the parameterised
> boundary (contract §6).

## A. Boundary / band mapping
| ID | Input | Expected |
|---|---|---|
| GV-01 | All params Low (composite ≤1.5) | Final = LOW; review 36m |
| GV-02 | All params High (composite >2.15) | Final = HIGH; EDD; review 12m |
| GV-03 | Composite exactly 1.5000, no override | Math = LOW (unrounded boundary) |
| GV-04 | Composite exactly 1.5001, no override | Math = MEDIUM |
| GV-05 | Composite exactly 2.1500, no override | Calculator set: MEDIUM. CRAM set: HIGH. (boundary-dependent) |
| GV-06 | Composite exactly 2.1501, no override | HIGH under both sets |
| GV-07 | Composite 2.10, no override | Calculator: MEDIUM. CRAM: HIGH. Assert audit records which set was used |

## B. Non-dilution / floors (the heart of the model)
| ID | Input | Expected |
|---|---|---|
| GV-08 | Composite 1.3 (Low) + Foreign PEP true match (OVR-008) | Final = HIGH (floor not diluted) |
| GV-09 | Domestic PEP, otherwise Low composite | Final = LOW — identification only (Art. 15 Second); no automatic floor |
| GV-09b | IO PEP, otherwise Low composite | Final = LOW — not presumed High |
| GV-09c | Domestic PEP + cross-border service/product | Final = MEDIUM (OVR-016); Art. 15(b–d) measures |
| GV-09d | IO PEP + Medium+ composite | Final = MEDIUM (OVR-016) when high-risk relationship |
| GV-10 | Adverse media true match, otherwise Low | Final = HIGH (OVR-009) |
| GV-11 | Manual downgrade attempted below a High floor | Rejected / requires policy exception; never below floor |

## C. Hard stops / prohibitions (non-bypassable)
| ID | Input | Expected |
|---|---|---|
| GV-12 | Sanctions/TFS true match | PROHIBITED; activation blocked; later scoring short-circuited |
| GV-13 | Internal watchlist true match | HARD STOP / PROHIBITED |
| GV-14 | LP unable/refused to verify UBO (OVR-004) | REJECT (or High pending remediation); no composite dilution |
| GV-15 | FI/LP shell bank (OVR-005) | PROHIBITED; cannot be overridden by a business user |
| GV-16 | Nature-of-business score = 4 | PROHIBITED |
| GV-17 | Country firm_score = 4 (residence or SoW) | PROHIBITED |
| GV-18 | Category A country nexus (Iran/North Korea/Syria) | No account / prohibition |

## D. Missing data / integrity
| ID | Input | Expected |
|---|---|---|
| GV-19 | A mandatory parameter left blank | Status BLOCKED/INCOMPLETE; missing fields listed; no final rating; activation blocked |
| GV-20 | Optional parameter omitted | Factor re-normalises on scored params; no block |
| GV-21 | Unmapped profession/country/activity | At least Medium pending mapping (never Low); remediation flagged |

## E. Events / lifecycle
| ID | Input | Expected |
|---|---|---|
| GV-22 | Existing NP, turnover >3× expected, rapid pass-through | Event rescore → Medium/High; TM investigation |
| GV-23 | Country library moves a country Medium→High | Affected customers rescore at next event/periodic review |
| GV-24 | New product = international transfer added | Pre-activation rescore; product/geography monitoring on |
| GV-25 | STR/SAR filed on existing customer | HIGH floor (OVR-010); enhanced monitoring; exit/risk-acceptance review |

## F. Config governance (application-layer tests)
| ID | Input | Expected |
|---|---|---|
| GV-26 | Update factor weights without a different Checker | Rejected 403 (maker-checker) |
| GV-27 | API attempt to change OVR-001 active_flag | Rejected 403 (locked) and logged |
| GV-28 | Weight change where factor sum ≠ 100% | Rejected by validation |
| GV-29 | Re-score identical inputs + same versions | Identical output (reproducibility) |

## G. Activity / profession (ISIC Rev. 5) — see `docs/06`
| ID | Input | Expected |
|---|---|---|
| GV-30 | LP activity "casino / gaming" (no ISIC code) | Resolves ISIC 9200 via typology lookup / rule VH01 → activity score 3 (High); matched_rules include VH01 |
| GV-31 | LP activity "money services business / remittance" | ISIC 6619 (lookup) + rule H01 → score 3 (High); EDD |
| GV-32 | LP provides ISIC code 6419 (banking) | `isic_aml_mapping` base = High (3); theme = banking/credit |
| GV-33 | LP activity "grocery convenience store" | ISIC 4711; base Medium (2); rule MH02 (cash-intensive) keeps Medium → score 2 |
| GV-34 | LP activity on the CRAM prohibited nature-of-business list (score 4) | Activity = prohibition → PROHIBITED (not averaged) |
| GV-35 | LP activity "arms / ammunition dealer" | Rule VH02 → High + sanctions/export-control screening; prohibition where appetite/sanctions require |
| GV-36 | NP profession "lawyer / notary" | `profession.csv` max'd with profession-guidance High + rule H05 gatekeeper → score 3; EDD where forming/controlling entities |
| GV-37 | NP profession not in library | At least Medium pending mapping (never Low) + remediation task |
| GV-38 | LP activity free-text unresolvable to any ISIC code or legacy list | Theme fallback rating + flag for manual ISIC classification; never defaults to Low |
| GV-39 | Same activity resolved twice with same library_version | Identical ISIC code, score and matched_rules (reproducibility) |


NP-New, only the Geography factor scored, single parameter "residence country" =
High (3), intra-factor weight 100%, geography factor weight 20%. All other factors
blank. → factorScore(geo)=3 → factorContribution=0.60 → rawComposite=0.60? **No** —
blanks treated as 0 means composite = 0.60, which is below 1.0 and therefore
INVALID input shape: a real assessment must score all mandatory factors. This case
should return BLOCKED (mandatory factors unscored), demonstrating GV-19. Use it to
prove the engine blocks rather than producing an out-of-range composite.
