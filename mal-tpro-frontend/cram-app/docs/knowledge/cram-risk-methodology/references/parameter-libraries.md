# CRAM Reference — Parameter Libraries and Scoring Rules

Detailed scoring libraries for every factor. Score each parameter Low=1,
Medium=2, High=3, then roll parameters up into their factor, then combine
factors at the segment×lifecycle weights in SKILL.md §4. Every non-Low
parameter requires a reason code and a source field. Where a factor uses a
maximum-risk rule, the factor score is the highest applicable parameter.

## Contents
1. Natural Person (NP) profile parameter library
2. Legal Person / SME / Merchant (LP/MER) profile parameter library
3. Financial Institution (FI) — profile factor parameters
4. Financial Institution (FI) — systems-and-controls factor parameters
5. Geography and country risk (country library + customer geography attributes)
6. Product and service risk (driver library, treatment rules, digital-bank baseline matrix)
7. Digital onboarding and channel assurance (new + existing)
8. Expected activity, behaviour and funding risk
9. Screening, sanctions, PEP and adverse intelligence

---

## 1. Natural Person (NP) profile parameter library

| Parameter | Weight | Low = 1 | Medium = 2 | High = 3 | Required control |
|---|---|---|---|---|---|
| Employment / occupation risk | 15% | Salaried employee, pensioner or student with verified sponsor/income source | Self-employed, freelancer, commission-based, variable income, or occupation pending clarification | Unemployed with high activity, high-risk occupation, cash-intensive occupation, or unclear source of funds | Occupation library linked to source-of-funds evidence rules |
| Customer segment | 10% | Mass retail/payroll with verified employer and ordinary product needs | Affluent, SME owner, freelancer, non-payroll, or multiple product needs | HNW, private-banking-like profile, politically connected exposure, or high-value relationship | Segment derived from product eligibility and customer profile |
| PEP exposure | 15% | No PEP exposure | Domestic PEP, former PEP, or low-materiality associate where policy permits Medium | Foreign PEP, IO PEP, close associate/family of material PEP, or high-risk PEP nexus | PEP screening + declaration reconciliation; High floor where applicable |
| Source of funds quality | 15% | Verified salary, pension or regulated-employer income | Self-declared income with reasonable evidence or partially verified business income | Third-party funds, unexplained funds, complex or inconsistent source | Mandatory evidence by risk level |
| Source of wealth complexity | 10% | Not applicable or simple verified accumulation | Business ownership, investments or inheritance with partial support | Complex offshore wealth, crypto-derived wealth, or unverified wealth | EDD required where High |
| Residency / legal status | 10% | Resident with verified address and legal status | Non-resident in acceptable country with strong evidence, or short-term residence with explanation | Unclear residence, conflicting addresses, transient profile, or unable to verify | Non-resident may create Medium/High floor depending on evidence |
| Adverse intelligence | 15% | No material adverse media or internal negative history | Low/moderate adverse media with mitigation | Material adverse media, prior exit, law-enforcement concern, or financial-crime allegation | Material true adverse media is High floor or reject |
| Customer cooperation / transparency | 10% | Complete, consistent and timely information | Minor gaps resolved before activation | Refusal, inconsistent explanation, or inability to verify identity/source | Failure to complete CDD is reject/exit |

## 2. Legal Person / SME / Merchant (LP/MER) profile parameter library

| Parameter | Weight | Low = 1 | Medium = 2 | High = 3 | Implementation rule |
|---|---|---|---|---|---|
| Legal form and structure | 15% | Simple UAE entity, listed/publicly supervised, or transparent operating company | Standard LLC/SME, free-zone entity, or ordinary ownership structure | Trust/foundation/nominee/bearer-like, offshore, SPV, multi-layer or opaque structure | Complex structure floors ≥Medium; opacity floors High or reject |
| Ownership and control transparency | 20% | UBOs and controllers identified and verified; simple ownership | Multiple layers but UBO/control verified | UBO unclear/refused, nominee concerns, circular ownership, or inability to verify | Refusal or inability to identify UBO is reject or High pending remediation |
| Business activity / industry | 20% | Low-risk professional, retail or ordinary service activities | General trading, e-commerce, import/export, or medium-risk industry | DPMS, arms/defence, unlicensed financial activity, high-risk NPO/charity, high-risk sectors, or virtual-asset nexus | Industry library mapped to ISIC/MCC |
| Operating history | 7.5% | Operating >3 years with evidence | Operating 1–3 years or limited evidence | Newly incorporated with high expected turnover or unusual activity | New entity not prohibited but may trigger Medium/High floor |
| Regulatory / licensing status | 10% | License verified and activity aligned | License pending renewal or minor mismatch remediated before activation | Unlicensed regulated activity, expired/suspicious license, or activity outside license | Unlicensed regulated activity is prohibited/reject |
| Related-party PEP/sanctions/adverse exposure | 12.5% | None | Domestic PEP or moderate adverse intelligence with mitigation | Foreign PEP, material adverse intelligence, sanctions nexus, or high-risk controller | Highest material related-party risk floors the customer rating |
| Business model transparency | 10% | Clear customers, suppliers, revenue model and economic purpose | Partially explained but plausible business model | No apparent lawful economic purpose, inconsistent model, or shell indicators | No lawful purpose is reject/exit |
| Merchant / digital presence | 5% | Verified website/store, consistent MCC and transparent settlement | New website/marketplace, moderate chargeback/refund exposure | Hidden ownership, deceptive activity, high-risk digital goods, high refund/chargeback exposure | Merchant risks feed product and behaviour factors |

## 3. Financial Institution (FI) — profile factor parameters (§7.3.1)

| Parameter | Weight | Low = 1 | Medium = 2 | High = 3 | Evidence |
|---|---|---|---|---|---|
| Nature of FI activity | 25% | Standard regulated banking/financial activity, no high-risk services | Regulated FI with material cross-border, wholesale or higher-risk services within appetite | Correspondent, nested/downstream, payable-through, MSB/exchange, stored value, VASP, private banking or trade-finance high-risk activity | License, questionnaire, product/service schedule |
| Legal structure and physical presence | 20% | Simple regulated legal structure with verified physical presence | Group structure with added complexity but transparent and verified | Shell bank, online-only bank without adequate licensing/physical presence, unlicensed entity, or structure outside appetite | Corporate registry, license, physical-presence evidence |
| Ownership and control transparency | 20% | Transparent ownership/control, no unexplained recent changes | Complex ownership or recent ownership change but verified and explained | Bearer/nominee/trust opacity, unidentified UBO, or inability to verify control persons | Ownership chart and UBO evidence |
| Regulatory oversight | 20% | Regulator applies FATF standards; no material AML/CFT/CPF concern | Regime or enforcement history requires enhanced review | Weak regulator, FATF high-risk jurisdiction, unclear license, or serious AML/CFT/CPF enforcement action | Regulator review and enforcement screening |
| Adverse regulatory / financial-crime history | 15% | No material enforcement, sanctions, fraud or adverse media history | Minor or remediated issue with evidence | Recent serious AML/CFT/CPF sanction, sanctions evasion, fraud, corruption, or unresolved adverse intelligence | Adverse media, regulatory notices, audit reports |

## 4. Financial Institution (FI) — systems-and-controls factor parameters (§7.3.2)

This factor enters the composite **once** at its §4 factor weight (15% FI New/Exist.). Its parameters roll up into it; they are **not** added to the composite separately.

| Parameter | Weight | Low = 1 | Medium = 2 | High = 3 | Evidence |
|---|---|---|---|---|---|
| KYC/CDD and sanctions policy | 20% | Written, approved, recently updated AML/CFT/CPF/TFS policies | Policy exists but outdated, incomplete or weakly evidenced | No adequate policy evidence or refusal to provide | Policy pack, approval date, gap assessment |
| TFS/sanctions screening capability | 20% | Automated screening of customers, related parties and transactions with list updates and escalation | Partial/manual screening or limitations requiring compensating controls | No effective screening evidence or unresolved control weakness | Screening architecture, list sources, SLAs, sample alerts |
| AML monitoring and STR/SAR framework | 20% | Documented monitoring, escalation and reporting framework with governance evidence | Framework exists but gaps or limited evidence remain | No documented framework or material weakness | TM coverage, SAR/STR procedures, governance minutes |
| PEP/adverse media controls | 15% | Robust PEP/adverse media screening and periodic refresh | Partial controls or manual reliance | No effective PEP/adverse media control evidence | Screening results, procedures, QA evidence |
| Correspondent/nested customer controls | 15% | Clear downstream-customer prohibition or controls, payable-through restrictions, respondent due diligence | Limited downstream visibility but mitigants documented | Unknown downstream exposure, nested relationships, or payable-through features without control | Questionnaire, contractual controls, respondent assessment |
| Independent audit, training and governance | 10% | Recent independent AML audit, remediation tracking, role-based training and governance reporting | Audit/training exists but limited or stale | No independent review, training or governance evidence | Audit report, training logs, issue register |

---

## 5. Geography and country risk methodology (Section 8)

### 5.1 Country risk library (8.1) — pillars feeding the composite country risk level

| Country risk pillar | Weight | Low = 1 | Medium = 2 | High = 3 | Mandatory rule |
|---|---|---|---|---|---|
| Sanctions / TFS exposure | 30% | No relevant sanctions nexus | Targeted or sectoral sanctions exposure requiring monitoring | Comprehensive sanctions, UN/UAE TFS exposure, or prohibited nexus | Confirmed UN/UAE TFS true match = Prohibited / freeze / escalate |
| FATF status | 20% | Not subject to increased monitoring or call for action | Increased monitoring or grey-list equivalent | Call for action, countermeasure, or equivalent | Follow current regulatory requirements and risk appetite |
| PF, terrorism, conflict and instability | 10% | No material PF/terrorism/conflict concern | Moderate concern or regional exposure | High PF, terrorism, conflict or evasion risk | PF high-risk nexus floors relevant customer/product to High |
| Corruption and transparency | 10% | Strong public integrity and transparency | Moderate corruption/secrecy concerns | High corruption, secrecy or weak BO transparency | High corruption + complex structure floors entity to High |
| AML/CFT supervisory quality | 10% | Strong supervision and enforcement | Moderate supervisory weakness | Strategic deficiencies or weak enforcement | Applies materially to FI/partner due diligence |
| Predicate offence exposure | 5% | Low known exposure | Moderate organized crime/narcotics/predicate exposure | High exposure to organized crime/narcotics/major predicates | High exposure increases EDD and monitoring |
| Tax transparency / offshore risk | 5% | Transparent jurisdiction | Moderate secrecy/offshore features | High secrecy, nominee, or opaque corporate services | Relevant to UBO/SOW complexity |
| Internal typology and bank exposure | 10% | No significant internal typology findings | Moderate alerts/losses/cases | High STR/SAR, fraud, mule, sanctions or exit experience | Compliance may escalate country rating on internal evidence |

### 5.2 Customer-specific geography attributes (8.2)

| Customer type | Attribute | Weight within geography factor | Scoring method | Floor / treatment |
|---|---|---|---|---|
| NP | Residence country | 25% | Lookup country library rating | High-risk residence floors to High unless prohibited |
| NP | Primary/secondary nationality | 20% | Highest score across nationalities | Sanctions/TFS nationality nexus triggers screening escalation |
| NP | Country of birth | 10% | Lookup where available; capture unavailable reason | Does not alone floor to High unless combined with other indicators |
| NP | SOF/SOW country | 15% | Highest country score across recurring funds and wealth origin | High-risk source country requires EDD evidence |
| NP | Expected transaction corridors | 15% | Highest corridor score or exposure-weighted method | High-risk corridor enhances monitoring |
| NP | Digital geolocation signals | 15% | Highest risk among IP/GPS/SIM/device inconsistency | VPN/TOR/high-risk mismatch may trigger Medium/High floor |
| LP/MER | Incorporation, operation, UBO/controller and settlement countries | Weighted / highest-risk mix | Country library lookup + related-party materiality | High-risk or prohibited country exposure floors Medium/High/Reject by appetite |
| FI | Regulator, licensing, ownership, downstream exposure and corridors | Weighted / highest-risk mix | Country library + regulator-quality assessment | Weak regulator, unknown downstream exposure or high-risk corridor floors High |

---

## 6. Product and service risk methodology (Section 9)

### 6.1 Product risk driver library (9.1)

| Driver | Weight | Low = 1 | Medium = 2 | High = 3 | Implementation rule |
|---|---|---|---|---|---|
| Liquidity and convertibility | 10% | Low liquidity or restricted usage | Moderate liquidity | Instantly liquid, transferable or cash-equivalent | Cards, wallets, instant payments typically score higher |
| Velocity / speed | 10% | Slow settlement or controlled disbursement | Same-day or limited rapid movement | Real-time/high-velocity movement | Higher velocity increases layering and mule risk |
| Cross-border capability | 10% | Domestic only | Limited corridors/currencies | Open or high-risk cross-border corridors | High-risk corridor may trigger product/geography High |
| Third-party payment capability | 10% | Own-account only | Limited third-party transfers | Broad third-party/beneficiary payments | Requires beneficiary screening and monitoring |
| Anonymity / opacity | 10% | Transparent named customer only | Some intermediary opacity | Obscured ownership, virtual identifiers or nested users | Anonymous or bearer-like product is prohibited |
| Value scalability / limits | 8% | Low limits and low balances | Moderate limits | High value, scalable or rapidly changeable limits | Limit increases trigger pre-activation rescore |
| Cash/cash-equivalent exposure | 8% | No cash-equivalent exposure | Limited exposure | Cash, prepaid, crypto/VA, high cash-equivalent functionality | Cash-equivalent exposure floors Medium/High |
| Trade/PF/dual-use exposure | 8% | No trade/PF relevance | Limited goods/counterparty exposure | Trade finance, dual-use goods, or high-risk shipping/corridors | PF indicators trigger High |
| Fraud/scam/mule exposure | 10% | Low susceptibility | Moderate susceptibility | Known mule/scam/ATO exploitation or high fraud typology | Fraud and AML signals must be linked |
| Merchant/card-not-present exposure | 6% | Not applicable or low-risk card-present | Standard e-commerce merchant risk | High chargeback/refund, digital goods, or deceptive model | Merchant acquiring requires merchant score |
| API/open banking/automation exposure | 5% | No third-party/API access | Controlled API with limited scope | Bulk/API/TPP access enabling nested activity | Partner/API due diligence required |
| Control weakness indicator | 5% | No material control weakness | Known limitation with remediation plan | Weak, untested or failed product controls | Strong controls cannot reduce inherent score; weak controls may increase risk or require remediation |

### 6.2 Product risk treatment rules (9.2)

- Each product must have an approved product risk score **before launch or activation**.
- With multiple products, the customer product factor uses the **highest** active/requested product score unless a validated exposure-weighted method is approved.
- Product features (cross-border, API access, merchant activation, virtual IBANs, limit increases, high-risk corridors) **trigger pre-activation reassessment**.
- Strong controls may prevent additional uplift or support risk acceptance but **must not reduce inherent product risk** below the risk implied by product features.
- Weak controls must increase the score, trigger remediation, restrict activation, or require risk acceptance depending on severity.

### 6.3 Digital-bank product baseline matrix (9.3)

| Product / service | Baseline risk | System treatment |
|---|---|---|
| Basic current/savings account | Medium | Medium unless restricted to verified salary/own-account transfers and low limits |
| Salary/payroll account | Low–Medium | Medium where employer is high-risk or source unclear |
| Debit card | Medium | High where cross-border/high-risk MCC/crypto/gambling exposure enabled without controls |
| Credit or virtual card | Medium–High | High for high limits or instant virtual issuance with weak identity assurance |
| Domestic transfers / instant payments | Medium–High | High for high limits, new-beneficiary velocity, or weak authentication |
| International transfers / remittances | High | High by default; corridor controls and beneficiary screening mandatory |
| Wallet / stored value | High | High by default; prohibited if anonymous or unverified |
| Virtual accounts / virtual IBANs | High | High; requires LP/MER/FI due diligence and monitoring |
| Merchant acquiring / payment gateway | High | High for high-risk MCCs, digital goods, cross-border merchants, or payment facilitators |
| Open banking / API access | Medium–High | High for bulk payment initiation, partner aggregation, or nested customers |
| Trade finance / invoice finance | High | High by default; PF and goods screening required |
| Crypto/virtual asset exposure (where not licensed) | **Prohibited/Restricted** | Reject/block unless expressly permitted by license, policy and controls |

---

## 7. Digital onboarding and channel assurance (Section 10)

### 7.1 New customer digital onboarding parameters (10.1)

| Parameter | Weight | Low = 1 | Medium = 2 | High = 3 | Floor / control |
|---|---|---|---|---|---|
| Identity proofing source | 20% | UAE Pass/Emirates ID or approved reliable independent source | Approved IDSP with documentary and database checks | Document upload only, weak or unknown source | Weak source floors High or onboarding hold |
| Document authenticity | 12.5% | Automated authenticity pass, no tampering | Manual review or partial validation resolved | Fail, tampering, expired/invalid document | Fail = reject/remediate before scoring |
| Biometric match and liveness | 17.5% | Strong biometric match and liveness pass | Inconclusive but remediated with approved method | Mismatch, liveness fail, suspected deepfake/injection | High floor; confirmed fraud = reject |
| Device integrity | 10% | Normal device; no emulator/root/jailbreak | Unknown or new device with limited history | Rooted/jailbroken, emulator, tampered, device farm | High floor where combined with weak ID or high-risk geography |
| IP/GPS/SIM/geolocation consistency | 10% | Consistent with declared profile | Minor mismatch explained | High-risk, impossible travel, spoofed or anonymized location | Compliance/fraud review |
| Application velocity / link analysis | 10% | No duplicate or suspicious links | Moderate duplicate/household links | Multiple applications from same device/IP/biometric/contact data | Fraud review and possible rejection |
| Authentication and credential binding | 10% | Device binding plus biometric/passkey/MFA | App OTP/SMS OTP with other controls | Password/SMS-only for high-risk actions | Step-up before activation |
| Vendor/model assurance | 5% | Vendor independently assured and monitored | Vendor approved but limited performance history | Vendor untested or material issue | Cannot rely without risk acceptance |
| Exception/fallback handling | 5% | No exception or approved evidence-based fallback | Manual exception with documented approval | Repeated or undocumented overrides | Compliance approval required |

### 7.2 Existing customer digital channel parameters (10.2)

| Parameter | Weight | Low = 1 | Medium = 2 | High = 3 | Trigger action |
|---|---|---|---|---|---|
| Authentication strength | 20% | Biometric/passkey/MFA with device binding | MFA present but not phishing-resistant | Weak authentication or SMS-only for high-risk events | Step-up and channel score increase |
| Device change behaviour | 15% | Stable device pattern | Normal new device with verification | Frequent device changes, emulator/root, or device farm | Hold high-risk transactions |
| Credential lifecycle events | 15% | Normal password/MFA management | Occasional reset/change | SIM swap, email change + new device + beneficiary setup | ATO/scam review and rescore |
| IP/geolocation anomaly | 15% | Consistent location | Moderate inconsistency | Impossible travel, high-risk country, VPN/TOR for high-risk event | Review; Medium/High floor |
| High-risk digital actions | 15% | No high-risk action or normal action | Beneficiary/limit/contact change with controls | Stacked actions: new beneficiary + limit increase + large transfer | Hold/step-up/recalculate |
| API/open banking access | 10% | No API/TPP access or low scope | Limited scope TPP access | Bulk payments, unattended API, or partner access | Partner/API controls required |
| Fraud/scam/mule indicators | 10% | No indicators | Low/moderate resolved indicator | Confirmed or repeated mule/scam/ATO indicators | High floor and case management |

---

## 8. Expected activity, behaviour and funding risk (Section 11)

Expected activity is collected at onboarding and validated after activation.
Existing-customer scoring must use **observed behaviour in rolling windows** —
not just monetary thresholds. Detect velocity, pass-through, counterparty
concentration, unexpected corridors, dormancy-to-activity, funding anomalies and
alert/case outcomes.

| Behavioural metric | Medium trigger | High trigger | System action |
|---|---|---|---|
| Turnover deviation | Actual monthly turnover 2× expected without explanation | Actual >3× expected, high-risk corridor involved, or activity inconsistent with profile | Create review task; High trigger recalculates immediately |
| New-beneficiary velocity | 3–5 new beneficiaries in 7 days | >5 new beneficiaries in 7 days, or large transfer to new beneficiaries | Step-up authentication and TM scenario |
| Pass-through ratio | >60% funds leave within 48 hours without explanation | >80% funds leave within 24 hours with multiple counterparties | Mule/layering review and possible High floor |
| Third-party funding | Material third-party funds inconsistent with profile | Repeated third-party funding from unrelated/high-risk parties | EDD, restrictions or exit review |
| Cross-border exposure | Unexpected corridor appears | High-risk corridor or sanctions/high-risk adjacency appears | Rescore geography/product/transaction factor |
| Dormancy then sudden activity | Dormant account resumes material activity | Dormant account resumes high-volume/high-risk corridor activity | Event review and possible restriction |
| Rejected/fraudulent card or merchant activity | Elevated but explainable rejection/chargeback/refund pattern | High chargeback/refund/fraud rate or deceptive merchant indicator | Merchant/customer rescore and potential restriction |
| STR/SAR or confirmed suspicion | Any confirmed suspicion outcome | STR/SAR filed or suspicion cannot be mitigated | High floor; confidential handling and tipping-off control |

---

## 9. Screening, sanctions, PEP and adverse intelligence (Section 12)

Screening is **in scope** of this methodology and is a mandatory pre-activation
control. Run for the customer **and material related parties**.

| Screening type | When performed | System output | Risk outcome |
|---|---|---|---|
| UN/UAE TFS and sanctions | Pre-onboarding, ongoing list updates, before material activation/transactions | Clear, potential match, true match, false positive, pending | True match = hard stop/freeze/escalate/report; pending = hold |
| PEP screening | Pre-onboarding and ongoing refresh for customers and related parties | PEP category, role, country, relationship, date | Foreign/IO PEP usually High; domestic PEP Medium/High based on role and controls |
| Adverse media | Pre-onboarding, periodic and trigger-based | Severity, category, source, date, disposition | Material true adverse media floors High or reject |
| Internal watchlist / exited customer | Pre-onboarding and event review | Prior exit, rejected onboarding, fraud/mule, suspected sanctions evasion | Financial-crime exit floors High or reject |
| Law enforcement / regulatory inquiry | Event-based | Inquiry category, status, evidence | Review trigger; High where material |
| VASP/crypto exposure screening | Where applicable by policy and product | Direct/indirect exposure, wallet/VA linkage where available | High or prohibited based on license and risk appetite |

**Pending-hold enforcement:** a pending screening result blocks activation until
resolved; maximum hold is **48 hours** before Compliance escalation (see BRD
FR-014). False-positive dispositions must capture disposer, rationale and
timestamp.
