/**
 * Authoritative CRAM methodology document content.
 * Primary source: Customer Risk Assessment Methodology CBUAE Digital Bank (CRAM-CBUAE-2026-05-FREEZE-01).
 * Implementation appendix: live Mal FinCrime OS configuration.
 */
import { DEFAULT_BAND_BOUNDARIES } from "./bandBoundaries";
import { DEFAULT_FACTOR_WEIGHTS, getFactorWeights } from "./runtimeConfig";
import { CUSTOMER_TYPE_WEIGHTS, ACTIVITY_LIBRARY_VERSION } from "./activityRiskConfig";
import { MODEL_VERSION_ID } from "../validation/independentValidation";
import { OVERRIDES } from "../engine/data";
import { OUTCOMES } from "../engine/cram";
import { CFG } from "../engine/cramSuiteConfig";
import entityLegalTypes from "../data/entity_legal_types.json";

export const METHODOLOGY_DOCUMENT = {
  title: "Customer Risk Assessment Methodology",
  subtitle: "Customer Risk Rating / Customer Risk Assessment Model",
  modelVersionId: "CRAM-CBUAE-2026-05-FREEZE-01",
  confidentiality: "Strictly Private and Confidential",
  owner: "Financial Crime Compliance / MLRO / Model Owner",
  approvalForum: "Senior Governance Forum / Board Risk & Compliance Committee",
  documentType:
    "Customer Risk Assessment Methodology, model-design specification and rule-engine implementation standard",
} as const;

export const EXECUTIVE_SUMMARY = `This Customer Risk Assessment Methodology establishes a single, internally consistent and CBUAE-aligned framework for calculating, approving and maintaining customer financial-crime risk ratings across enterprise and digital-bank customer populations. It is designed for implementation through a configurable rule engine, supported by controlled reference libraries, workflow routing, audit evidence, source-system lineage and model governance.

The methodology calculates an inherent customer risk score on a 1.0000 to 3.0000 scale, assigns a mathematical rating, applies hard stops and non-dilutable risk floors, and then routes the customer to the required CDD, EDD, approval, monitoring and review outcome. The framework deliberately separates mathematical scoring from mandatory overrides so that sanctions, PEP, STR/SAR, UBO verification failure, prohibited products, synthetic identity, failed digital identity and other critical risk indicators cannot be diluted by weighted averaging.

This version is approved for production build. Production deployment requires completion and independent review of data readiness, vendor readiness, SIT, UAT, calibration, parallel run and governance sign-off against the frozen model_version_id.`;

export const PURPOSE = {
  section: "1. Purpose, Objectives and Scope",
  purpose: `The purpose of this methodology is to define the policy, data, scoring, override, workflow and governance rules used to assess customer financial-crime risk at onboarding and throughout the customer lifecycle. It enables consistent, explainable and auditable decisions on customer acceptance, CDD/EDD, approval authority, monitoring intensity, review frequency, restrictions, rejection, freezing, exit and regulatory escalation.`,
  objectives: [
    "Assign every in-scope customer and material related party a reproducible risk assessment record linked to a model_version_id.",
    "Calculate a raw mathematical score to at least four decimal places and apply rating thresholds to the unrounded raw score.",
    "Ensure 100% of mandatory factors and critical fields are either populated, blocked, or conservatively treated before approval.",
    "Apply hard stops and risk floors independently of the weighted score to prevent risk dilution.",
    "Generate reason codes and evidence references for all non-Low factors, overrides, data-quality exceptions and approval decisions.",
    "Trigger event-driven reassessment on material changes in customer profile, ownership, product, geography, digital channel, transaction behaviour, screening status or suspicion.",
    "Support independent validation, internal audit and regulatory reconstruction through point-in-time inputs, model versions, reference-library versions and immutable audit records.",
  ],
  scope: [
    "New-to-bank onboarding, existing customer refresh, event-driven review, remediation, restriction, exit review and portfolio batch rescore.",
    "Natural persons including retail, payroll, affluent, HNW, joint accounts, minors, guardians, attorneys and authorised users.",
    "Legal persons including SMEs, free-zone entities, offshore entities, trusts/legal arrangements, SPVs, charities/NPOs, merchants and platform sellers.",
    "Financial institutions and regulated partners including correspondent/respondent relationships, PSPs, exchange houses, NBFIs, VASPs where permitted, fintech partners and payment facilitators.",
    "Digital channels including mobile, internet banking, digital onboarding, merchant portals, API/open-banking channels, remote servicing and high-risk remote account maintenance.",
    "Products including deposit accounts, salary accounts, cards, instant payments, domestic and cross-border transfers, merchant acquiring, payment gateway, virtual accounts/IBANs, wallets/stored value where offered, finance products, trade-related products and API/third-party access arrangements.",
  ],
  outOfScopeNote:
    "FATCA and CRS tax classification are performed under the End-to-End Customer Lifecycle and Onboarding Operating Model. Tax outcomes feed this methodology only as customer-profile and geography risk inputs.",
};

export const DESIGN_PRINCIPLES: { principle: string; rule: string }[] = [
  { principle: "Risk-based and evidence-led", rule: "Risk outcomes must be driven by documented risk indicators, controlled libraries, source-system data and approved judgement. Generic or unsupported risk assumptions are not permitted." },
  { principle: "Non-dilution", rule: "Hard stops and mandatory floors override the mathematical score. A Low or Medium composite score must never suppress a prohibited or High-risk condition." },
  { principle: "Inherent risk first", rule: "The primary rating is an inherent financial-crime risk rating. Residual controls may be used for management reporting, but must not reduce mandatory CDD/EDD treatment or override floors." },
  { principle: "Point-in-time reproducibility", rule: "Every completed assessment must be reproducible from the customer data, reference libraries, model version, rule version and approvals effective at the time of assessment." },
  { principle: "No default-to-Low", rule: "Missing, unmapped, inconsistent or pending critical data must block completion or be conservatively treated. No field may default to UAE, Low, \"none\" or zero unless sourced and evidenced." },
  { principle: "Configurable governance", rule: "Weights, thresholds, rules, libraries, workflows and reason codes must be configurable through approved parameter tables, not hard-coded, except where security architecture requires controlled code deployment." },
  { principle: "Lifecycle sensitivity", rule: "New customers rely more on profile, product, geography and digital onboarding assurance. Existing customers must place higher weight on actual behaviour and emerging risk events." },
  { principle: "Auditability and explainability", rule: "Users must be able to see factor scores, parameter scores, top drivers, overrides, workflow status, evidence and next review date." },
];

export const RATING_BANDS = [
  {
    band: "1.0000 – 1.5000",
    rating: "Low",
    treatment: "Standard CDD; SDD only where legally permitted and explicitly evidenced.",
    rule: "Apply only where no override, floor, missing critical data or unresolved screening issue exists.",
  },
  {
    band: "1.5001 – 2.1500",
    rating: "Medium",
    treatment: "Standard CDD plus targeted controls, clarifications and monitoring adjustments.",
    rule: "Medium floor rules may force this rating even where raw score is Low.",
  },
  {
    band: "2.1501 – 3.0000",
    rating: "High",
    treatment: "EDD, enhanced monitoring, senior/delegated approval and shorter review cycle.",
    rule: "High also applies where mandatory floor or override is triggered.",
  },
  {
    band: "Override only",
    rating: "Prohibited / Reject / Freeze / Exit",
    treatment: "No relationship or restricted legal/sanctions handling as required.",
    rule: "Cannot be downgraded by business user or mathematical score.",
  },
];

export const CALCULATION_SEQUENCE = [
  "Identify customer segment, lifecycle stage and material related-party roles.",
  "Load the active approved model_version_id, factor weights, parameter weights, thresholds, libraries and override rules.",
  "Validate mandatory data completeness and screening prerequisites.",
  "Score parameters using controlled libraries and deterministic rules.",
  "Calculate factor scores by weighted average, maximum-risk rule or approved range logic, as configured.",
  "Calculate raw composite score = Σ(factor_score × factor_weight).",
  "Map raw composite score to Low, Medium or High using the authoritative rating bands.",
  "Apply hard prohibitions, High floors and Medium floors in priority order.",
  "Produce final rating, CDD/EDD outcome, approval route, monitoring profile and next review date.",
  "Persist the full audit record and publish the approved rating to source and downstream systems.",
];

export const ROUNDING_CONTROLS = [
  "Raw composite scores must be stored to at least four decimal places; six decimal places are preferred for configuration validation.",
  "Threshold decisions must use the unrounded raw score. Display rounding must never drive the final rating.",
  "All weights must be stored as decimals, not only displayed percentages (e.g. 16.666667% is stored as 0.166667).",
  "Deployment weight-total tolerance is ±0.0001 per factor set. Any active segment/lifecycle weight set outside tolerance must fail deployment.",
  "No intermediate contribution may be rounded before summation.",
];

export const COMPOSITE_FORMULA = `composite_score = Σ over factors { [ Σ over parameters in factor (parameter_score × parameter_weight) / Σ (parameter_weights present in factor) ] × factor_weight }

parameter_score ∈ {1 = Low, 2 = Medium, 3 = High}; composite_score ∈ [1.0000, 3.0000]. Product & service and channel factors use worst-of (maximum) pillar logic where configured.`;

export const CUSTOMER_SEGMENTS = [
  { code: "NP", segment: "Natural Person", roles: "Customer, joint holder, minor, guardian, attorney, authorised user, cardholder, sole establishment owner where applicable.", treatment: "NP profile, geography, product, digital channel and expected/actual activity factors. Apply highest material related-party risk where the party can transact, control or benefit." },
  { code: "LP", segment: "Legal Person / SME", roles: "Company, partnership, trust, foundation, SPV, NPO/charity, UBO, shareholder, director, manager, signatory, POA, controller, parent.", treatment: "Entity profile, ownership/control, business activity, geography, product, channel and activity factors. Unverified UBO or no lawful purpose is a hard stop or High pending remediation." },
  { code: "MER", segment: "Merchant / Platform Seller", roles: "Merchant entity, beneficial owner, administrator, website/app owner, settlement account, payment facilitator or platform relationship.", treatment: "LP scoring plus merchant MCC, chargeback/refund risk, card-not-present exposure, payout velocity, settlement and digital presence rules." },
  { code: "FI", segment: "Financial Institution / Regulated Partner", roles: "Respondent, correspondent-style relationship, PSP, exchange house, NBFI, VASP where permitted, fintech partner, payment facilitator, downstream/nested exposure.", treatment: "FI six-factor taxonomy including standalone systems and controls. Correspondent, nested, downstream or high-risk corridor exposure requires EDD and senior approval." },
  { code: "EMP", segment: "Employee / High-Risk Insider Relationship", roles: "Staff customer, staff-related business interest, privileged user with customer relationship exposure.", treatment: "Track as a relationship risk indicator and conflict/insider risk overlay. Do not reduce or replace customer CRR scoring." },
];

/** §6.1 Active production factor weights — authoritative methodology table */
export const FACTOR_WEIGHTS_BY_SEGMENT = {
  headers: ["Factor", "NP New", "NP Existing", "LP/MER New", "LP/MER Existing", "FI New", "FI Existing"],
  rows: [
    ["Customer profile risk", "25%", "20%", "25%", "20%", "20%", "15%"],
    ["Geography / sanctions nexus risk", "20%", "15%", "20%", "15%", "20%", "20%"],
    ["Systems and controls", "N/A", "N/A", "N/A", "N/A", "15%", "15%"],
    ["Product / service / correspondent risk", "20%", "15%", "20%", "15%", "20%", "20%"],
    ["Digital onboarding / channel / API assurance", "25%", "20%", "20%", "15%", "10%", "10%"],
    ["Expected activity / transaction behaviour / funding", "10%", "30%", "15%", "35%", "15%", "20%"],
    ["Total", "100%", "100%", "100%", "100%", "100%", "100%"],
  ],
};

export const NP_PROFILE_PARAMETERS = {
  headers: ["Parameter", "Weight", "Low = 1", "Medium = 2", "High = 3"],
  rows: [
    ["Employment / occupation risk", "15%", "Salaried employee, pensioner or student with verified sponsor/income source", "Self-employed, freelancer, commission-based, variable income, or occupation pending clarification", "Unemployed with high activity, high-risk occupation, cash-intensive occupation, or unclear source of funds"],
    ["Customer segment", "10%", "Mass retail/payroll with verified employer and ordinary product needs", "Affluent, SME owner, freelancer, non-payroll, or multiple product needs", "HNW, private-banking-like profile, politically connected exposure, or high-value relationship"],
    ["PEP exposure", "15%", "No PEP exposure", "Domestic PEP, former PEP, or low-materiality associate where policy permits Medium", "Foreign PEP, IO PEP, close associate/family of material PEP, or high-risk PEP nexus"],
    ["Source of funds quality", "15%", "Verified salary, pension or regulated-employer income", "Self-declared income with reasonable evidence or partially verified business income", "Third-party funds, unexplained funds, complex or inconsistent source"],
    ["Source of wealth complexity", "10%", "Not applicable or simple verified accumulation", "Business ownership, investments or inheritance with partial support", "Complex offshore wealth, crypto-derived wealth, or unverified wealth"],
    ["Residency / legal status", "10%", "Resident with verified address and legal status", "Non-resident in acceptable country with strong evidence, or short-term residence with explanation", "Unclear residence, conflicting addresses, transient profile, or unable to verify"],
    ["Adverse intelligence", "15%", "No material adverse media or internal negative history", "Low/moderate adverse media with mitigation", "Material adverse media, prior exit, law-enforcement concern, or financial-crime allegation"],
    ["Customer cooperation / transparency", "10%", "Complete, consistent and timely information", "Minor gaps resolved before activation", "Refusal, inconsistent explanation, or inability to verify identity/source"],
  ],
};

export const LP_PROFILE_PARAMETERS = {
  headers: ["Parameter", "Weight", "Low = 1", "Medium = 2", "High = 3"],
  rows: [
    ["Legal form and structure", "15%", "Simple UAE entity, listed/publicly supervised, or transparent operating company", "Standard LLC/SME, free-zone entity, or ordinary ownership structure", "Trust/foundation/nominee/bearer-like, offshore, SPV, multi-layer or opaque structure"],
    ["Ownership and control transparency", "20%", "UBOs and controllers identified and verified; simple ownership", "Multiple layers but UBO/control verified", "UBO unclear/refused, nominee concerns, circular ownership, or inability to verify"],
    ["Business activity / industry", "20%", "Low-risk professional, retail or ordinary service activities", "General trading, e-commerce, import/export, or medium-risk industry", "DPMS, arms/defence, unlicensed financial activity, high-risk NPO/charity, high-risk sectors, or virtual-asset nexus"],
    ["Operating history", "7.5%", "Operating >3 years with evidence", "Operating 1–3 years or limited evidence", "Newly incorporated with high expected turnover or unusual activity"],
    ["Regulatory / licensing status", "10%", "License verified and activity aligned", "License pending renewal or minor mismatch remediated before activation", "Unlicensed regulated activity, expired/suspicious license, or activity outside license"],
    ["Related-party PEP/sanctions/adverse exposure", "12.5%", "None", "Domestic PEP or moderate adverse intelligence with mitigation", "Foreign PEP, material adverse intelligence, sanctions nexus, or high-risk controller"],
    ["Business model transparency", "10%", "Clear customers, suppliers, revenue model and economic purpose", "Partially explained but plausible business model", "No apparent lawful economic purpose, inconsistent model, or shell indicators"],
    ["Merchant / digital presence", "5%", "Verified website/store, consistent MCC and transparent settlement", "New website/marketplace, moderate chargeback/refund exposure", "Hidden ownership, deceptive activity, high-risk digital goods, high refund/chargeback exposure"],
  ],
};

export const GEOGRAPHY_PILLARS = {
  headers: ["Country risk pillar", "Weight", "Low = 1", "Medium = 2", "High = 3"],
  rows: [
    ["Sanctions / TFS exposure", "30%", "No relevant sanctions nexus", "Targeted or sectoral sanctions exposure requiring monitoring", "Comprehensive sanctions, UN/UAE TFS exposure, or prohibited nexus"],
    ["FATF status", "20%", "Not subject to increased monitoring or call for action", "Increased monitoring or grey-list equivalent", "Call for action, countermeasure, or equivalent"],
    ["PF, terrorism, conflict and instability", "10%", "No material PF/terrorism/conflict concern", "Moderate concern or regional exposure", "High PF, terrorism, conflict or evasion risk"],
    ["Corruption and transparency", "10%", "Strong public integrity and transparency", "Moderate corruption/secrecy concerns", "High corruption, secrecy or weak BO transparency"],
    ["AML/CFT supervisory quality", "10%", "Strong supervision and enforcement", "Moderate supervisory weakness", "Strategic deficiencies or weak enforcement"],
    ["Predicate offence exposure", "5%", "Low known exposure", "Moderate organized crime/narcotics/predicate exposure", "High exposure to organized crime/narcotics/major predicates"],
    ["Tax transparency / offshore risk", "5%", "Transparent jurisdiction", "Moderate secrecy/offshore features", "High secrecy, nominee, or opaque corporate services"],
    ["Internal typology and bank exposure", "10%", "No significant internal typology findings", "Moderate alerts/losses/cases", "High STR/SAR, fraud, mule, sanctions or exit experience"],
  ],
};

export const PRODUCT_BASELINE_MATRIX = {
  headers: ["Product / service", "Baseline risk", "System treatment"],
  rows: [
    ["Basic current/savings account", "Medium", "Medium unless restricted to verified salary/own-account transfers and low limits"],
    ["Salary/payroll account", "Low–Medium", "Medium where employer is high-risk or source unclear"],
    ["Domestic transfers / instant payments", "Medium–High", "High for high limits, new-beneficiary velocity, or weak authentication"],
    ["International transfers / remittances", "High", "High by default; corridor controls and beneficiary screening mandatory"],
    ["Wallet / stored value", "High", "High by default; prohibited if anonymous or unverified"],
    ["Virtual accounts / virtual IBANs", "High", "High; requires LP/MER/FI due diligence and monitoring"],
    ["Merchant acquiring / payment gateway", "High", "High for high-risk MCCs, digital goods, cross-border merchants, or payment facilitators"],
    ["Open banking / API access", "Medium–High", "High for bulk payment initiation, partner aggregation, or nested customers"],
    ["Trade finance / invoice finance", "High", "High by default; PF and goods screening required"],
    ["Crypto/virtual asset exposure (where not licensed)", "Prohibited/Restricted", "Reject/block unless expressly permitted by license, policy and controls"],
  ],
};

export const BEHAVIOUR_TRIGGERS = {
  headers: ["Behavioural metric", "Medium trigger", "High trigger"],
  rows: [
    ["Turnover deviation", "Actual monthly turnover 2× expected without explanation", "Actual >3× expected, high-risk corridor involved, or activity inconsistent with profile"],
    ["New-beneficiary velocity", "3–5 new beneficiaries in 7 days", ">5 new beneficiaries in 7 days, or large transfer to new beneficiaries"],
    ["Pass-through ratio", ">60% funds leave within 48 hours without explanation", ">80% funds leave within 24 hours with multiple counterparties"],
    ["Third-party funding", "Material third-party funds inconsistent with profile", "Repeated third-party funding from unrelated/high-risk parties"],
    ["Cross-border exposure", "Unexpected corridor appears", "High-risk corridor or sanctions/high-risk adjacency appears"],
    ["STR/SAR or confirmed suspicion", "Any confirmed suspicion outcome", "STR/SAR filed or suspicion cannot be mitigated"],
  ],
};

/** §14 Due diligence, approval, monitoring and review outcomes — CBUAE authoritative */
export const OUTCOME_MAPPING = {
  headers: ["Final outcome", "CDD / EDD requirement", "Approval authority", "Review frequency (max)", "Monitoring intensity"],
  rows: [
    ["Low", "Standard CDD. SDD only where lawful, risk-supported, evidenced and not contradicted by facts.", "Automated/Operations or business delegated approval where policy permits.", "Maximum 36 months; earlier on trigger event.", "Standard monitoring and baseline digital controls."],
    ["Medium", "Standard CDD plus targeted additional information based on drivers.", "Operations/Compliance approval depending on driver.", "Maximum 24 months; earlier on event, DQ exception or activity deviation.", "Moderate monitoring and selected enhanced scenarios."],
    ["High", "EDD, SoF/SoW verification where relevant, adverse media review, enhanced sanctions/PEP checks and documented risk acceptance.", "Head of Compliance/MLRO or delegated senior approver; senior management for PEP/correspondent where required.", "Maximum 12 months; 6 months for very high-risk PEP/digital fraud/correspondent where risk appetite requires.", "Enhanced monitoring, lower thresholds, periodic adverse media and restrictions where required."],
    ["Prohibited / Reject / Freeze / Exit", "No relationship or restricted legal/sanctions handling as required.", "Compliance/MLRO/Legal escalation and governance approval.", "N/A.", "Block, freeze, reject, exit and report as required."],
  ],
};

export const EDD_EVIDENCE_MATRIX = {
  headers: ["Risk driver", "Minimum EDD evidence", "System task fields"],
  rows: [
    ["High geography", "Purpose of relationship, reason for country nexus, SOF/SOW evidence, expected corridors, adverse media review", "EDD_GEO_RATIONALE, SOF_EVIDENCE, SOW_EVIDENCE, CORRIDOR_JUSTIFICATION"],
    ["High product / service", "Product purpose, limit rationale, beneficiary/counterparty profile, product control confirmation", "PRODUCT_PURPOSE, LIMIT_APPROVAL, PRODUCT_CONTROL_CHECK"],
    ["PEP", "PEP role, public function, country, SoW, expected activity, senior approval", "PEP_ROLE, PEP_SOW, SENIOR_APPROVAL"],
    ["Complex ownership", "Ownership chart, UBO verification, legal purpose, source of wealth/funds", "OWNERSHIP_CHART, UBO_EVIDENCE, CONTROL_RATIONALE"],
    ["Digital ID exception", "Exception reason, compensating verification, fraud review outcome, approval", "DIGITAL_EXCEPTION_REASON, COMPENSATING_CONTROL, FRAUD_REVIEW"],
    ["Merchant high risk", "Website/app review, MCC validation, refund/chargeback controls, settlement review", "MERCHANT_DD, MCC_VALIDATION, SETTLEMENT_ACCOUNT_CHECK"],
    ["FI / regulated partner", "License/regulator verification, AML questionnaire, sanctions controls, downstream exposure, audit/certification", "FI_DD_PACK, AML_QA, DOWNSTREAM_EXPOSURE, SANCTIONS_CONTROL_REVIEW"],
  ],
};

export const OVERRIDE_REGISTRY = OVERRIDES.map((o) => ({
  id: o.id,
  trigger: o.trigger,
  outcome: o.outcome,
  priority: o.priority,
}));

export function buildImplementationAppendix() {
  const fw = getFactorWeights();
  const legalTypes = entityLegalTypes as Array<{ name: string; score: number; rating: string; prohibited?: boolean }>;
  const byScore = (s: number) => legalTypes.filter((e) => e.score === s).map((e) => e.name);

  return {
    platform: "Mal FinCrime OS",
    deployedModelVersion: MODEL_VERSION_ID,
    activityLibrary: ACTIVITY_LIBRARY_VERSION,
    activeFactorWeights: {
      customerType: `${(fw.customerType * 100).toFixed(0)}%`,
      geography: `${(fw.geography * 100).toFixed(0)}%`,
      product: `${(fw.product * 100).toFixed(0)}%`,
      service: `${(fw.service * 100).toFixed(0)}%`,
      productServiceCombined: `${((fw.product + fw.service) * 100).toFixed(0)}% (max pillar)`,
      channel: `${(fw.channel * 100).toFixed(0)}% (max pillar)`,
      transaction: `${(fw.transaction * 100).toFixed(0)}%`,
    },
    bandBoundaries: DEFAULT_BAND_BOUNDARIES,
    customerTypeWeights: CUSTOMER_TYPE_WEIGHTS,
    scoringPipeline: [
      "Data quality gate — mandatory capture; BLOCKED if incomplete",
      "Library resolution — ISIC Rev.5, profession, country, product registers",
      "Six-factor composite — weighted sum with worst-of pillars",
      "Non-dilution overrides — OVR-001…020; final = max(math band, floor)",
      "Golden thread — CDD/EDD, approval, review, monitoring profile",
      "Residual layer — control-adjusted view; cannot reduce override floors",
    ],
    goldenThreadConfig: {
      reviewMonthsPolicy: CFG.reviewMonths,
      controlWeights: CFG.controlWeights,
      residual: CFG.residual,
      expectedAedBands: CFG.expectedAed,
    },
    outcomesDisplay: OUTCOMES,
    entityLegalTypes: {
      total: legalTypes.length,
      score1Low: byScore(1),
      score2Medium: byScore(2),
      score3High: byScore(3),
      score4Prohibited: byScore(4),
    },
    implementationNotes: [
      "Production scoring uses segment×lifecycle weights from §6.1 via configurable factor-weight tables. Default runtime profile aligns to NP New onboarding unless lifecycle segment is selected.",
      "PEP is excluded from the customer-type composite in Mal FinCrime OS and applied exclusively through OVR-008 (High) and OVR-016 (Medium) non-dilution floors.",
      "Calculator band set (Low ≤ 1.5000 · Medium ≤ 2.1500) is the authoritative production boundary. CRAM sensitivity set (1.0 / 2.0) is available for calibration and test-bench analysis.",
      "Golden-thread review months in the operational UI reflect MLRO-approved operating policy and should be validated against §14 maximum frequencies during model governance sign-off.",
    ],
  };
}

export const TABLE_OF_CONTENTS = [
  "Executive Summary",
  "1. Purpose, Objectives and Scope",
  "2. Core Design Principles",
  "3. Authoritative Scoring Framework",
  "4. Customer Segments and Relationship Hierarchy",
  "5. Factor Weights by Segment and Lifecycle (§6.1)",
  "6. Natural Person Profile Parameter Library (§7.1)",
  "7. Legal Person / SME / Merchant Parameter Library (§7.2)",
  "8. Geography and Country Risk (§8.1)",
  "9. Product Baseline Matrix (§9.3)",
  "10. Expected Activity and Behaviour Triggers (§11)",
  "11. Overrides, Risk Floors and Prohibitions (§13)",
  "12. Due Diligence, Approval, Monitoring and Review (§14)",
  "13. EDD Evidence Matrix (§14.1)",
  "Appendix A — Mal FinCrime OS Implementation Binding",
  "Appendix B — Entity Legal Types Register",
];
