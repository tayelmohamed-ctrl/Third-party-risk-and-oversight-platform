/**
 * Global Account (US MSB/BaaS · Zenus) — reviewed & corrected transaction
 * purpose-code register. MLRO review of the Zenus 31-code list against the US
 * framework (31 CFR Ch. X · FinCEN Travel Rule · OFAC · AMLA 2020).
 *
 * This is the Global Account counterpart to the CBUAE/UAE purpose-code catalog
 * (transactionPurposeCatalog.ts) shown under Mal Bank. The two are deliberately
 * different: Mal Bank matches CBUAE/UAEFTS; Global Account matches Zenus/Convera.
 *
 * Source review: https://claude.ai/code/artifact/98fcd052-1c61-4a9d-90f5-61e685934271
 */

export type ZenusRisk = "Low" | "Medium" | "High" | "Prohibited";

export interface ZenusPurposeCode {
  id: number;
  name: string;
  note?: string;              // short descriptor shown under the name
  category: string;           // corrected Convera / WUBS purpose category
  categoryWas?: string;       // prior (wrong) category, when corrected
  type: "GA" | "SME" | "—";
  flows: { c2c: boolean; c2b: boolean; b2c: boolean; b2b: boolean; mal2mal: boolean };
  risk: ZenusRisk | "—";
  riskNote?: string;          // e.g. prohibited* conditionality
  trigger: string;            // EDD / monitoring trigger
  changed?: boolean;
  retired?: boolean;
  added?: boolean;
}

export const ZENUS_REVIEW_META = {
  title: "Zenus Purpose Code Register — Reviewed & Corrected",
  perimeter: "Global Account · US MSB / BaaS",
  source: "Zenus · 31 codes",
  documentId: "MAL-GA-PPC-ZENUS-v1.0",
  version: "1.0",
  basis: "31 CFR Chapter X · FinCEN Travel Rule (≥ US$3,000) · OFAC · AMLA 2020",
  confidentiality: "Strictly Private and Confidential — internal compliance work-product",
  artifactUrl: "https://claude.ai/code/artifact/98fcd052-1c61-4a9d-90f5-61e685934271",
  counts: { unchanged: 18, modified: 11, retired: 2, added: 1, activeTotal: 30 },
  framing:
    "The US has no mandatory purpose-of-payment code taxonomy for USD payments (unlike UAE UAEFTS or India RBI). These codes are a risk-management and correspondent-FX instrument, not a statutory filing. “Correct” means each code maps cleanly to an AML risk typology and TM scenario, flow directions do not manufacture mule/TF exposure, and the correspondent category is valid for the destination-country POP list. Nothing below is a regulatory breach — it is what makes the register examiner-defensible.",
} as const;

const F = (c2c: boolean, c2b: boolean, b2c: boolean, b2b: boolean, mal2mal: boolean) =>
  ({ c2c, c2b, b2c, b2b, mal2mal });

export const ZENUS_PURPOSE_CODES: ZenusPurposeCode[] = [
  { id: 1, name: "Personal / Living Expenses", category: "Family Maintenance", type: "GA", flows: F(true, false, false, false, true), risk: "Low", trigger: "Baseline monitoring" },
  { id: 2, name: "Credit Card Payments", category: "Financial", type: "GA", flows: F(false, true, false, true, false), risk: "Low", trigger: "Baseline" },
  { id: 3, name: "Personal Investment", category: "Investment", type: "GA", flows: F(false, true, false, false, false), risk: "Medium", trigger: "SoF on high value" },
  { id: 4, name: "Loan Repayment", category: "Loan", type: "GA", flows: F(true, true, false, true, true), risk: "Medium", trigger: "C2C leg: verify lender relationship" },
  { id: 5, name: "Family Support", note: "Cross-border remittance category", category: "Family Maintenance / Remittance", type: "GA", flows: F(true, false, false, false, true), risk: "High", trigger: "Structuring / mule watch; corridor EWRA" },
  { id: 6, name: "Education — Tuition & Student Support", note: "Merged former #19 (School/College Tuition)", category: "Education", type: "GA", flows: F(true, true, false, false, true), risk: "Low", trigger: "Verify institution on C2B leg", changed: true },
  { id: 7, name: "Rent Payment", category: "Property / Rent", type: "GA", flows: F(true, true, false, true, true), risk: "Low", trigger: "Baseline" },
  { id: 8, name: "Utility Bill Payment", category: "Utility / Financial", type: "GA", flows: F(false, true, false, true, false), risk: "Low", trigger: "Baseline" },
  { id: 9, name: "Charitable Donation", note: "C2C removed — donation to an individual is a TF/fraud typology", category: "Charity / Donation", type: "GA", flows: F(false, true, false, true, true), risk: "High", trigger: "Registered-NPO verification; TF screening", changed: true },
  { id: 10, name: "Purchase of Personal Goods", category: "Goods", type: "GA", flows: F(true, true, false, false, true), risk: "Medium", trigger: "Marketplace fraud / mule watch" },
  { id: 11, name: "Gift", category: "Gift", type: "GA", flows: F(true, false, false, false, true), risk: "High", trigger: "Layering cover — velocity + relationship" },
  { id: 12, name: "Insurance Premium", category: "Financial", categoryWas: "Medical Reimbursement", type: "GA", flows: F(false, true, false, true, false), risk: "Low", trigger: "Baseline", changed: true },
  { id: 13, name: "Medical Bills", category: "Medical Reimbursement", type: "GA", flows: F(true, true, true, false, true), risk: "Low", trigger: "B2C = employer/insurer reimbursement" },
  { id: 14, name: "Real Estate / Property Purchase", note: "Merged former #28; category & C2C fixed", category: "Property / Real Estate", categoryWas: "Other", type: "GA", flows: F(false, true, false, true, false), risk: "High", trigger: "SoF; high-value ML EDD", changed: true },
  { id: 15, name: "Salary Transfer", category: "Payroll", type: "GA", flows: F(false, false, true, false, false), risk: "Low", trigger: "Employer verification" },
  { id: 16, name: "Savings / Own-Account Transfer", note: "Renamed from vague “Preferable Saving / Interest Rate Offer”", category: "Financial", type: "GA", flows: F(false, true, false, true, true), risk: "Low", trigger: "Own-account name-match", changed: true },
  { id: 17, name: "Loan to Beneficiary", category: "Loan", type: "GA", flows: F(true, false, true, true, true), risk: "High", trigger: "Informal-lending / hawala EDD on C2C" },
  { id: 18, name: "Travel Expenses", category: "Travel", type: "GA", flows: F(true, true, false, true, true), risk: "Low", trigger: "Baseline" },
  { id: 19, name: "School / College Tuition Fees", note: "Retired — merged into #6", category: "—", type: "—", flows: F(false, false, false, false, false), risk: "—", trigger: "—", retired: true },
  { id: 20, name: "Mortgage Payment", category: "Property / Financial", type: "GA", flows: F(true, true, false, true, false), risk: "Medium", trigger: "Baseline" },
  { id: 21, name: "Household Repairs / Building Cost", category: "Goods & Services", type: "GA", flows: F(true, true, false, true, false), risk: "Medium", trigger: "Baseline" },
  { id: 22, name: "Account Closure / Balance Transfer", note: "Renamed & recategorised (was “Closure of Remitting Account”)", category: "Financial", categoryWas: "Trade Related", type: "GA", flows: F(false, true, true, true, false), risk: "Medium", trigger: "Closure rationale on file", changed: true },
  { id: 23, name: "Hire of Goods", category: "Services / Financial", type: "SME", flows: F(false, true, false, true, false), risk: "Medium", trigger: "Baseline" },
  { id: 24, name: "Fines / Penalties", category: "Government / Financial", type: "GA", flows: F(false, true, false, true, false), risk: "Low", trigger: "Baseline" },
  { id: 25, name: "Tax Bill", category: "Tax", type: "GA", flows: F(false, true, false, true, false), risk: "Low", trigger: "Baseline" },
  { id: 26, name: "Dividends", category: "Dividend / Investment", type: "GA", flows: F(false, false, true, true, false), risk: "Medium", trigger: "Baseline" },
  { id: 27, name: "Agricultural Goods", note: "Type set to SME for consistency with trade codes", category: "Trade / Goods", type: "SME", flows: F(false, true, false, true, false), risk: "Medium", trigger: "Trade-doc consistency", changed: true },
  { id: 28, name: "Real Estate Investments", note: "Retired — merged into #14", category: "—", type: "—", flows: F(false, false, false, false, false), risk: "—", trigger: "—", retired: true },
  { id: 29, name: "Import / Export Settlements", category: "Trade", type: "SME", flows: F(false, true, false, true, false), risk: "High", trigger: "TBML: trade docs, dual-use / goods screening" },
  { id: 30, name: "Art / Antiquities Purchase", note: "C2C removed; EDD added (AMLA-2020 antiquities focus)", category: "Trade / Other (EDD)", type: "GA", flows: F(false, true, false, true, false), risk: "High", trigger: "Provenance; high-value ML / sanctions", changed: true },
  { id: 31, name: "Other", note: "Gated — mandatory free-text justification + manual review", category: "Other", type: "GA", flows: F(true, true, true, true, true), risk: "High", trigger: "Justification mandatory; KRI on volume %", changed: true },
  { id: 32, name: "Virtual-Asset Settlement", note: "NEW — closes the crypto gap (Rain / SwiftX rails)", category: "Restricted", type: "GA", flows: F(false, false, false, false, false), risk: "Prohibited", riskNote: "*Auto-decline unless VA activity licensed & policy-approved", trigger: "*Blocked unless licensed & policy-approved", added: true },
];

export interface ZenusChange { title: string; detail: string; tag: string; }

export const ZENUS_CHANGE_LOG: ZenusChange[] = [
  { title: "Charitable Donation (#9) — C2C disabled", detail: "Donations to an individual are a recognised TF/fraud typology, acute on the PK/MENA Zenus corridors. Donations now route only to registered charities (C2B/B2B/Mal2Mal) with NPO verification.", tag: "Finding #1 · High" },
  { title: "Insurance Premium (#12) — category fixed", detail: "“Medical Reimbursement” → Financial. A premium is not a medical reimbursement; the mis-map would break Convera destination-country POP validation.", tag: "Finding #2 · mapping error" },
  { title: "Property consolidated (#14 ← #28)", detail: "“Purchase of Property” and “Real Estate Investments” merged into one code; type corrected from Other → Property/Real Estate; C2C disabled; High + SoF EDD.", tag: "Finding #3 · duplicate + misclass" },
  { title: "Education consolidated (#6 ← #19)", detail: "“Educational/Student Support” and “School/College Tuition” merged; institution-vs-relative handled as sub-flows, not two top-level codes.", tag: "Finding #4 · duplicate" },
  { title: "“Other” (#31) gated", detail: "Still available on all flows but now requires mandatory free-text justification, auto-routes to manual review, and its volume % becomes a KRI. Uncontrolled “Other” is the top examiner criticism.", tag: "Finding #5 · examiner risk" },
  { title: "Risk tiers + EDD triggers added to every code", detail: "High-risk covers — Family Support, Gift, Loan-to-beneficiary/C2C loans, Real Estate, Art, Import/Export (TBML) — now bind to EDD and Oscilar TM scenarios via CRAM.", tag: "Finding #6 · risk-tiering" },
  { title: "C2C column tightened", detail: "Implausible peer-to-peer purposes (charitable, property, art) disabled for C2C — the highest-risk mule/structuring flow.", tag: "Finding #7 · flow integrity" },
  { title: "Account Closure (#22) — renamed & recategorised", detail: "“Closure of Remitting Account / Trade Related” → “Account Closure / Balance Transfer / Financial”.", tag: "Finding #8 · mapping error" },
  { title: "Virtual-Asset code (#32) added", detail: "Closes the crypto gap given the Rain/SwiftX rails; defaults to auto-decline unless VA activity is licensed and policy-approved — so it can never hide inside “Other”.", tag: "Finding #9 · coverage gap" },
  { title: "Type column normalised", detail: "Trade purposes (Hire of Goods, Agricultural, Import/Export) set to SME consistently; GA = all customers, SME = business-tier onboarding.", tag: "Finding #10 · consistency" },
  { title: "“Preferable Saving” (#16) clarified", detail: "Renamed to “Savings / Own-Account Transfer” — the original read as a marketing label, not a payment purpose.", tag: "Minor" },
];

export const ZENUS_HANDOVER_NOTES: { title: string; detail: string }[] = [
  { title: "Validate every Convera category string per destination country", detail: "The categories here are recommendations; Convera (ex-WUBS) enforces its own POP list, and countries like Pakistan, Bangladesh and India require specific codes on the inbound leg. Confirm the exact string per corridor before go-live." },
  { title: "Reconcile against the internal catalog", detail: "Map all 30 active codes to MAL-TM-PPC-CATALOG-v1.0 (80 codes) so the correspondent taxonomy and the TM/CRAM taxonomy do not diverge — every Zenus code should resolve to an internal code with acceptable-use, misuse indicators and a TM scenario." },
  { title: "Wire High-tier codes to Oscilar + EDD", detail: "The risk tiers only add value once they trigger the corresponding TM scenarios and EDD tasks in the golden thread." },
  { title: "OFAC screens regardless of purpose", detail: "No purpose code exempts a payment from sanctions screening; the tiers govern AML intensity, not sanctions." },
];

export function zenusRiskCounts() {
  const active = ZENUS_PURPOSE_CODES.filter((c) => !c.retired);
  return {
    Low: active.filter((c) => c.risk === "Low").length,
    Medium: active.filter((c) => c.risk === "Medium").length,
    High: active.filter((c) => c.risk === "High").length,
    Prohibited: active.filter((c) => c.risk === "Prohibited").length,
  };
}
