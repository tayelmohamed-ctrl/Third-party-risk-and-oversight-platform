/**
 * Mal Bank SME product & service risk libraries — CRAM §9.1 drivers + portal products.
 * Scores: 1 Low · 2 Medium · 3 High · weighted average → product/service risk rate.
 */
import { KYB_PRODUCT_LABELS, type KybProduct } from "./kybDocumentMatrix";
import { MODEL_VERSION_ID } from "../validation/independentValidation";

export type RiskScore = 1 | 2 | 3;
export type RiskRate = "Low" | "Medium" | "High";

export interface RiskDriverDefinition {
  id: string;
  name: string;
  weightPct: number;
  weight: number;
  question: string;
  lowLabel: string;
  mediumLabel: string;
  highLabel: string;
  implementationRule: string;
}

export interface ScoredDriverOption {
  option: string;
  score: RiskScore;
}

export interface ProductRiskAssessment {
  id: string;
  name: string;
  malProduct: KybProduct;
  segment: string;
  drivers: Record<string, ScoredDriverOption>;
}

export interface ServiceRiskAssessment {
  id: string;
  name: string;
  segment: string;
  drivers: Record<string, ScoredDriverOption>;
}

/** Product risk rate bands — Mal CRAM workbook (Appendix A convention). */
export const PRODUCT_SERVICE_RATING_BANDS = [
  { rating: "High" as const, from: 2.01, to: 3.0 },
  { rating: "Medium" as const, from: 1.01, to: 2.0 },
  { rating: "Low" as const, from: 0.0, to: 1.0 },
];

export const PRODUCT_RISK_TREATMENT_RULES = [
  "Each product must have an approved product risk score before launch or customer activation.",
  "Where a customer has multiple products, the default customer product factor uses the highest active or requested product score unless a validated exposure-weighted method is approved.",
  "Product features such as cross-border enablement, API access, merchant activation, virtual IBANs, limit increases or high-risk corridors must trigger pre-activation reassessment.",
  "Strong controls may prevent additional uplift or support risk acceptance but must not reduce inherent product risk below the risk implied by product features.",
  "Weak controls must either increase the product risk score, trigger remediation, restrict activation or require risk acceptance depending on severity.",
];

/** §9.1 Product risk driver library — weights sum to 100%. */
export const PRODUCT_RISK_DRIVERS: RiskDriverDefinition[] = [
  { id: "liquidity", name: "Liquidity and convertibility", weightPct: 10, weight: 0.1, question: "How easily can funds be transferred into cash or another asset class?", lowLabel: "Low liquidity or restricted usage", mediumLabel: "Moderate liquidity", highLabel: "Instantly liquid, transferable or cash-equivalent", implementationRule: "Cards, wallets and instant payments typically score higher." },
  { id: "velocity", name: "Velocity / speed", weightPct: 10, weight: 0.1, question: "How quickly can value move through the product?", lowLabel: "Slow settlement or controlled disbursement", mediumLabel: "Same-day or limited rapid movement", highLabel: "Real-time/high-velocity movement", implementationRule: "Higher velocity increases layering and mule risk." },
  { id: "crossBorder", name: "Cross-border capability", weightPct: 10, weight: 0.1, question: "Can the product enable transfer of funds out of the UAE?", lowLabel: "Domestic only", mediumLabel: "Limited corridors/currencies", highLabel: "Open or high-risk cross-border corridors", implementationRule: "High-risk corridor may trigger product/geography High." },
  { id: "thirdParty", name: "Third-party payment capability", weightPct: 10, weight: 0.1, question: "Can payments be made to third-party beneficiaries?", lowLabel: "Own-account only", mediumLabel: "Limited third-party transfers", highLabel: "Broad third-party/beneficiary payments", implementationRule: "Requires beneficiary screening and monitoring." },
  { id: "anonymity", name: "Anonymity / opacity", weightPct: 10, weight: 0.1, question: "Do product features provide anonymity for owner or beneficiary?", lowLabel: "Transparent named customer only", mediumLabel: "Some intermediary opacity", highLabel: "Obscured ownership, virtual identifiers or nested users", implementationRule: "Anonymous or bearer-like product is prohibited." },
  { id: "valueScale", name: "Value scalability / limits", weightPct: 8, weight: 0.08, question: "Can transaction values or limits scale rapidly?", lowLabel: "Low limits and low balances", mediumLabel: "Moderate limits", highLabel: "High value, scalable or rapidly changeable limits", implementationRule: "Limit increases trigger pre-activation rescore." },
  { id: "cashEq", name: "Cash/cash-equivalent exposure", weightPct: 8, weight: 0.08, question: "Does the product have cash-equivalent functionality?", lowLabel: "No cash-equivalent exposure", mediumLabel: "Limited exposure", highLabel: "Cash, prepaid, crypto/VA, high cash-equivalent functionality", implementationRule: "Cash-equivalent exposure floors Medium/High." },
  { id: "tradePf", name: "Trade/PF/dual-use exposure", weightPct: 8, weight: 0.08, question: "Is trade finance, PF or dual-use goods relevant?", lowLabel: "No trade/PF relevance", mediumLabel: "Limited goods/counterparty exposure", highLabel: "Trade finance, dual-use goods or high-risk shipping/corridors", implementationRule: "PF indicators trigger High." },
  { id: "fraud", name: "Fraud/scam/mule exposure", weightPct: 10, weight: 0.1, question: "Susceptibility to fraud, scam or mule typologies?", lowLabel: "Low susceptibility", mediumLabel: "Moderate susceptibility", highLabel: "Known mule/scam/ATO exploitation or high fraud typology", implementationRule: "Fraud and AML signals must be linked." },
  { id: "merchant", name: "Merchant/card-not-present exposure", weightPct: 6, weight: 0.06, question: "Card-not-present or merchant acquiring exposure?", lowLabel: "Not applicable or low-risk card-present", mediumLabel: "Standard e-commerce merchant risk", highLabel: "High chargeback/refund, digital goods or deceptive model", implementationRule: "Merchant acquiring requires merchant score." },
  { id: "api", name: "API/open banking/automation exposure", weightPct: 5, weight: 0.05, question: "Third-party or API access enabled?", lowLabel: "No third-party/API access", mediumLabel: "Controlled API with limited scope", highLabel: "Bulk/API/TPP access enabling nested activity", implementationRule: "Partner/API due diligence required." },
  { id: "control", name: "Control weakness indicator", weightPct: 5, weight: 0.05, question: "Material product control weakness?", lowLabel: "No material control weakness", mediumLabel: "Known limitation with remediation plan", highLabel: "Weak, untested or failed product controls", implementationRule: "Strong controls cannot reduce inherent score; weak controls may increase risk or require remediation." },
];

/** Service risk drivers — Mal SME service layer (aligned to §9 themes; weights sum to 100%). */
export const SERVICE_RISK_DRIVERS: RiskDriverDefinition[] = [
  { id: "volume", name: "Volume / velocity", weightPct: 15, weight: 0.15, question: "Will the service be mixed with a high volume of other services or rapid movement?", lowLabel: "Unlikely / controlled volume", mediumLabel: "Likely moderate volume", highLabel: "High volume or rapid pass-through", implementationRule: "Higher velocity increases layering and mule risk." },
  { id: "crossBorder", name: "Cross-border", weightPct: 15, weight: 0.15, question: "Does the service enable cross-border asset movement?", lowLabel: "Domestic only", mediumLabel: "Limited corridors", highLabel: "Yes — open or high-risk corridors", implementationRule: "High-risk corridor may trigger geography/product High." },
  { id: "thirdParty", name: "Third-party payment", weightPct: 14, weight: 0.14, question: "Can the service enable payment to another entity?", lowLabel: "Own-account only", mediumLabel: "Limited third-party", highLabel: "Yes — broad beneficiary payments", implementationRule: "Requires beneficiary screening and monitoring." },
  { id: "fraud", name: "Fraud / market abuse", weightPct: 14, weight: 0.14, question: "Can the service be used for fraud or market abuse?", lowLabel: "Unlikely", mediumLabel: "Likely with controls", highLabel: "High susceptibility or confirmed typology", implementationRule: "Fraud and AML signals must be linked." },
  { id: "anonymity", name: "Anonymity", weightPct: 14, weight: 0.14, question: "Do service features provide anonymity for related parties?", lowLabel: "No", mediumLabel: "Partial opacity", highLabel: "Yes — obscured parties or nested use", implementationRule: "Anonymous features are prohibited." },
  { id: "technology", name: "Technology", weightPct: 14, weight: 0.14, question: "Does technology enable financial-crime abuse?", lowLabel: "No high-risk tech exposure", mediumLabel: "Moderate digital automation", highLabel: "Yes — API, bulk automation or weak assurance", implementationRule: "Digital channel assurance must be maintained." },
  { id: "obligation", name: "Obligation / commitment", weightPct: 14, weight: 0.14, question: "Does the service create financial obligation or credit exposure?", lowLabel: "No material obligation", mediumLabel: "Limited commitment", highLabel: "Yes — credit, guarantee or settlement obligation", implementationRule: "Credit/financing services require enhanced monitoring." },
];

function d(option: string, score: RiskScore): ScoredDriverOption {
  return { option, score };
}

/** Mal Bank SME products — UAE IBAN · Global Account (Zenus) · Financing. */
export const MAL_SME_PRODUCT_ASSESSMENTS: ProductRiskAssessment[] = [
  {
    id: "sme_uae_iban",
    name: "SME Current Account — UAE IBAN",
    malProduct: "uae_iban",
    segment: "SME · Legal person (LP/MER)",
    drivers: {
      liquidity: d("Moderate liquidity", 2),
      velocity: d("Same-day / limited rapid movement", 2),
      crossBorder: d("Domestic only", 1),
      thirdParty: d("Limited third-party transfers", 2),
      anonymity: d("Transparent named customer only", 1),
      valueScale: d("Moderate limits", 2),
      cashEq: d("Limited exposure", 2),
      tradePf: d("No trade/PF relevance", 1),
      fraud: d("Moderate susceptibility", 2),
      merchant: d("Not applicable / low-risk card-present", 1),
      api: d("No third-party/API access", 1),
      control: d("No material control weakness", 1),
    },
  },
  {
    id: "global_account_zenus",
    name: KYB_PRODUCT_LABELS.global_account,
    malProduct: "global_account",
    segment: "SME · Cross-border · Zenus programme",
    drivers: {
      liquidity: d("Instantly liquid / transferable", 3),
      velocity: d("Real-time/high-velocity movement", 3),
      crossBorder: d("Open or high-risk cross-border corridors", 3),
      thirdParty: d("Broad third-party/beneficiary payments", 3),
      anonymity: d("Some intermediary opacity (virtual IBAN)", 2),
      valueScale: d("High value, scalable limits", 3),
      cashEq: d("Limited exposure", 2),
      tradePf: d("Limited goods/counterparty exposure", 2),
      fraud: d("Moderate susceptibility", 2),
      merchant: d("Not applicable", 1),
      api: d("Controlled API with limited scope", 2),
      control: d("No material control weakness", 1),
    },
  },
  {
    id: "sme_financing",
    name: KYB_PRODUCT_LABELS.financing,
    malProduct: "financing",
    segment: "SME · Credit · Trade / working capital",
    drivers: {
      liquidity: d("Moderate liquidity", 2),
      velocity: d("Controlled disbursement", 2),
      crossBorder: d("Limited corridors/currencies", 2),
      thirdParty: d("Limited third-party (lender–borrower)", 2),
      anonymity: d("Transparent named customer only", 1),
      valueScale: d("High value, scalable limits", 3),
      cashEq: d("No cash-equivalent exposure", 1),
      tradePf: d("Trade finance / dual-use exposure", 3),
      fraud: d("Moderate susceptibility", 2),
      merchant: d("Not applicable", 1),
      api: d("No third-party/API access", 1),
      control: d("No material control weakness", 1),
    },
  },
  {
    id: "domestic_instant_payments",
    name: "Domestic Instant Payments (UAEFTS / Aani)",
    malProduct: "uae_iban",
    segment: "SME · Payment product",
    drivers: {
      liquidity: d("Instantly liquid / transferable", 3),
      velocity: d("Real-time/high-velocity movement", 3),
      crossBorder: d("Domestic only", 1),
      thirdParty: d("Broad third-party/beneficiary payments", 3),
      anonymity: d("Transparent named customer only", 1),
      valueScale: d("Moderate limits", 2),
      cashEq: d("Limited exposure", 2),
      tradePf: d("No trade/PF relevance", 1),
      fraud: d("Moderate susceptibility", 2),
      merchant: d("Not applicable", 1),
      api: d("No third-party/API access", 1),
      control: d("No material control weakness", 1),
    },
  },
  {
    id: "sme_debit_card",
    name: "SME Debit Card",
    malProduct: "uae_iban",
    segment: "SME · Card product",
    drivers: {
      liquidity: d("Instantly liquid / transferable", 3),
      velocity: d("Real-time/high-velocity movement", 3),
      crossBorder: d("Limited corridors/currencies", 2),
      thirdParty: d("Limited third-party transfers", 2),
      anonymity: d("Transparent named customer only", 1),
      valueScale: d("Moderate limits", 2),
      cashEq: d("Limited exposure", 2),
      tradePf: d("No trade/PF relevance", 1),
      fraud: d("Moderate susceptibility", 2),
      merchant: d("Standard e-commerce merchant risk", 2),
      api: d("No third-party/API access", 1),
      control: d("No material control weakness", 1),
    },
  },
];

/** Mal Bank SME services — operational service layer scored separately from product pillar. */
export const MAL_SME_SERVICE_ASSESSMENTS: ServiceRiskAssessment[] = [
  {
    id: "domestic_payments",
    name: "Domestic Payment Services",
    segment: "SME · UAE IBAN",
    drivers: {
      volume: d("Likely", 2),
      crossBorder: d("No", 1),
      thirdParty: d("Yes", 3),
      fraud: d("Likely", 2),
      anonymity: d("No", 1),
      technology: d("No", 1),
      obligation: d("No", 1),
    },
  },
  {
    id: "salary_deposit",
    name: "Salary / Payroll Deposit Processing",
    segment: "SME · UAE IBAN",
    drivers: {
      volume: d("Likely", 2),
      crossBorder: d("No", 1),
      thirdParty: d("Limited third-party", 2),
      fraud: d("Unlikely", 1),
      anonymity: d("No", 1),
      technology: d("No", 1),
      obligation: d("No", 1),
    },
  },
  {
    id: "bill_payments",
    name: "Bill Payment Services",
    segment: "SME · UAE IBAN",
    drivers: {
      volume: d("Likely", 2),
      crossBorder: d("No", 1),
      thirdParty: d("Yes", 3),
      fraud: d("Likely", 2),
      anonymity: d("No", 1),
      technology: d("No", 1),
      obligation: d("No", 1),
    },
  },
  {
    id: "debit_card_mgmt",
    name: "Debit Card Issuance & Card Management",
    segment: "SME · Card servicing",
    drivers: {
      volume: d("Likely", 2),
      crossBorder: d("Yes", 3),
      thirdParty: d("Yes", 3),
      fraud: d("Likely", 2),
      anonymity: d("No", 1),
      technology: d("No", 1),
      obligation: d("Yes", 3),
    },
  },
  {
    id: "digital_banking",
    name: "Digital Banking / Mobile App Access",
    segment: "SME · Digital channel",
    drivers: {
      volume: d("Likely", 2),
      crossBorder: d("Yes", 3),
      thirdParty: d("Yes", 3),
      fraud: d("Likely", 2),
      anonymity: d("No", 1),
      technology: d("Yes", 3),
      obligation: d("Yes", 3),
    },
  },
  {
    id: "global_account_servicing",
    name: "Global Account Servicing (USD / Zenus wires)",
    segment: "SME · Global Account",
    drivers: {
      volume: d("High volume / rapid movement", 3),
      crossBorder: d("Yes", 3),
      thirdParty: d("Yes", 3),
      fraud: d("Likely", 2),
      anonymity: d("Partial opacity", 2),
      technology: d("Yes", 3),
      obligation: d("Yes", 3),
    },
  },
  {
    id: "financing_servicing",
    name: "SME Financing & Credit Servicing",
    segment: "SME · Financing",
    drivers: {
      volume: d("Likely", 2),
      crossBorder: d("Yes", 3),
      thirdParty: d("Limited third-party", 2),
      fraud: d("Likely", 2),
      anonymity: d("No", 1),
      technology: d("No", 1),
      obligation: d("Yes", 3),
    },
  },
];

export function weightedRiskScore(
  drivers: RiskDriverDefinition[],
  assessment: Record<string, ScoredDriverOption>,
): number {
  const raw = drivers.reduce((sum, drv) => {
    const picked = assessment[drv.id];
    return sum + drv.weight * (picked?.score ?? 2);
  }, 0);
  return Math.round(raw * 100) / 100;
}

export function riskRateFromScore(score: number): RiskRate {
  if (score <= 1.0) return "Low";
  if (score <= 2.0) return "Medium";
  return "High";
}

export function assessProduct(item: ProductRiskAssessment) {
  const score = weightedRiskScore(PRODUCT_RISK_DRIVERS, item.drivers);
  return { score, rate: riskRateFromScore(score) };
}

export function assessService(item: ServiceRiskAssessment) {
  const score = weightedRiskScore(SERVICE_RISK_DRIVERS, item.drivers);
  return { score, rate: riskRateFromScore(score) };
}

export const WORKBOOK_META = {
  modelVersionId: MODEL_VERSION_ID,
  title: "Mal Bank CRAM — Product & Service Risk Workbooks",
  subtitle: "SME · UAE IBAN · Global Account (Zenus) · Financing",
  methodologyRef: "CRAM §9 Product and Service Risk Methodology · CRAM-CBUAE-2026-05-FREEZE-01",
};
