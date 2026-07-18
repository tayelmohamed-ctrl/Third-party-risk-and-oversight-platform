/**
 * Rain Prohibitions List — the Rain (Signify Holdings / Third National / Rain Payments) programme
 * prohibitions that govern the Global Account (US MSB) perimeter, which runs on Rain rails.
 *
 * Source: "Rain Prohibitions List", last updated 2026-04-27. Applies to all partners, platforms and
 * end users (cardholders and virtual-account users) interacting with Rain's products and systems.
 *
 * IMPORTANT — SCOPE: the Rain Prohibitions List gates Rain's CARD and VIRTUAL-ACCOUNT products only.
 * It is NOT a customer-level financial-crime rating and NOT a transfer block. A resident of a Rain-
 * prohibited country (e.g. Turkey) can still hold a USD account and make transfers/payouts — they
 * simply cannot be issued a Rain card or open a Rain virtual account, and a card cannot be used to
 * spend in a spending-prohibited country. So this list drives PRODUCT ELIGIBILITY (data-quality gate)
 * and TRANSACTION MONITORING (Oscilar TM rules), never the CRAM composite / customer rating.
 *
 * Enforcement in this engine (US / global_account perimeter only — Mal Bank / UAE has its own rules):
 *  - Residence / registration in a prohibited country (§I.A cardholder, §III.A virtual account — the
 *    same 17-country list) → the CARD and VIRTUAL-ACCOUNT products are ineligible for that resident
 *    (dataQualityGate.ts RAIN_PRODUCT_PROHIBITED). USD account + payout/transfers stay available.
 *  - Prohibited business types (§I.B cards + §III.B virtual accounts) → card/VA declined (the genuinely
 *    illegal activities are independently CRAM-Prohibited via the Zenus §6.4 screen regardless).
 *  - Enhanced-review business types (§I.C) → card/VA permitted with licensing/regulatory evidence.
 *  - Spending-prohibited countries (§II.A), prohibited card purchases (§II.B) and prohibited virtual-
 *    account activities (§III.C) are transaction-time controls → Oscilar TM rules OS-TM-071…076.
 *
 * NOTE: the residence list gates the card/VA product for 6 residences beyond the Zenus floors — China,
 * India, Israel, Nepal, Turkey, Vietnam. Turkey is a permitted CRAM corridor in the off-us scenario
 * packs; there is NO conflict, because Turkey-resident customers remain fully workable for transfers —
 * only the Rain card / virtual account is withheld. The spending-prohibited list (§II.A, 7 countries)
 * does NOT include Turkey — card spending is blocked only in Cuba, Iran, North Korea, Russia, Syria,
 * Ukraine and Venezuela.
 */

export const RAIN_PROHIBITIONS_LAST_UPDATE = "2026-04-27";
export const RAIN_PROHIBITIONS_SOURCE =
  "Rain Prohibitions List (Signify Holdings / Nimbus d/b/a Third National / Rain Payments / Rain Products) — last updated 2026-04-27";

/**
 * §I.A + §III.A — prohibited RESIDENCE / registration countries (identical for cardholders and
 * virtual-account end users). Residence here → hard block, individuals AND entities. Names match
 * the country registry (countries.json); "(Mainland)" is normalised away for matching.
 */
export const RAIN_PROHIBITED_RESIDENCE_COUNTRIES: string[] = [
  "Belarus",
  "China",
  "Cuba",
  "India",
  "Iran",
  "Iraq",
  "Israel",
  "Myanmar",
  "Nepal",
  "Nicaragua",
  "North Korea",
  "Russia",
  "Syria",
  "Turkey",
  "Ukraine",
  "Venezuela",
  "Vietnam",
];

/** §II.A — countries where Rain card spending is prohibited (entity or individual). */
export const RAIN_SPENDING_PROHIBITED_COUNTRIES: string[] = [
  "Cuba",
  "Iran",
  "North Korea",
  "Russia",
  "Syria",
  "Ukraine",
  "Venezuela",
];

/**
 * §I.B + §III.B — business types Rain prohibits under any circumstances (cards + virtual accounts).
 * Keyword screen against declared activity / entity type. Prohibited → decline/exit.
 */
export const RAIN_PROHIBITED_BUSINESS_KEYWORDS: string[] = [
  "illegal drug", "controlled drug", "controlled substance", "narcotic", "drug paraphernalia",
  "sarms", "peptide", "pseudo-pharmaceutical",
  "human trafficking", "prostitution", "escort", "mail-order bride", "mail order bride",
  "counterfeit", "unauthorized goods", "intellectual property infringement",
  "pyramid scheme", "ponzi", "multilevel marketing", "multi-level marketing", "mlm",
  "child exploitation", "illegal digital content", "protected digital content",
  "political campaign", "campaign fundraising", "donation platform",
  "illegal gambling", "unlicensed gambling", "unlicensed betting",
  "unlicensed msb", "unlicensed money service", "nested banking", "nested payment",
  "weapon", "arms dealing", "arms manufacturing", "firearm", "munition", "explosive", "fireworks",
  "adult content", "adult services", "adult classifieds",
  "hate group", "intolerance", "promoting violence", "promoting hatred",
  "endangered species", "protected wildlife", "wildlife trade",
  "abortion",
  "direct marketing",
];

/**
 * §I.C — business models Rain MAY serve, subject to ENHANCED review (licensing, regulatory
 * compliance, strong internal controls). Keyword screen → High floor + evidence, NOT a block.
 */
export const RAIN_ENHANCED_REVIEW_BUSINESS_KEYWORDS: string[] = [
  "money service business", "msb", "remittance",
  "cryptocurrency", "crypto exchange", "crypto platform", "virtual asset", "vasp",
  "charity", "charities", "non-governmental", "ngo", "nonprofit", "non-profit",
  "precious metal", "bullion", "gold dealer", "jewellery dealer",
  "creator platform", "subscription streaming", "tipping platform", "online content platform",
  "gambling", "fantasy sports", "betting operator",
];

/**
 * §II.B — prohibited Rain card PURCHASE types (transaction-time; feeds card-channel TM rules).
 */
export const RAIN_PROHIBITED_CARD_PURCHASE_KEYWORDS: string[] = [
  "digital currency", "cryptocurrency purchase", "crypto trade",
  "marijuana", "cannabis", "cbd", "black-market", "black market", "drug",
  "dark web", "darknet", "hacking", "cybercrime",
  "unlicensed pharmacy", "internet pharmacy",
  "firearm", "ammunition", "explosive",
  "hazardous material", "hazmat",
  "escort",
  "unlicensed auction", "illegal auction",
  "unregulated lending", "payday loan",
  "data brokerage",
  "endangered species", "wildlife product",
];

/**
 * §III.C — prohibited Rain VIRTUAL-ACCOUNT activity types (transaction-time; feeds transfer TM rules).
 */
export const RAIN_PROHIBITED_VA_ACTIVITY_KEYWORDS: string[] = [
  "unlicensed gambling", "illegal gambling", "illegal betting",
  "controlled substance", "drug paraphernalia", "sarms", "peptide", "pseudo-pharmaceutical",
  "dark web", "hacking", "cybercrime", "theft-related",
  "predatory lending", "credit repair", "abusive debt",
  "unlicensed cryptocurrency", "illegal cryptocurrency",
  "weapon", "firearm", "munition", "explosive", "fireworks",
  "hazardous material", "poisonous material",
  "espionage", "signal jammer", "signal blocker",
  "escort", "adult content", "adult classifieds",
  "illegal digital content", "protected digital content",
  "counterfeit", "intellectual property infringement",
  "human remains", "body parts",
  "intolerance", "promoting violence", "promoting hatred",
  "endangered species", "wildlife product",
  "abortion",
  "direct marketing",
];

const norm = (s: string | undefined): string =>
  (s ?? "").trim().toLowerCase().replace(/\s*\(mainland\)\s*/g, "").replace(/\s+/g, " ").trim();

const RESIDENCE_SET = new Set(RAIN_PROHIBITED_RESIDENCE_COUNTRIES.map(norm));
const SPENDING_SET = new Set(RAIN_SPENDING_PROHIBITED_COUNTRIES.map(norm));

/** True if a residence / operating jurisdiction is on the Rain prohibited-residence list (§I.A/§III.A). */
export function isRainProhibitedResidence(country: string | undefined): boolean {
  return RESIDENCE_SET.has(norm(country));
}

/**
 * True if a product is a Rain virtual-account product (§III — "Virtual Accounts / Virtual IBANs").
 * Deliberately does NOT match "Credit / Virtual Card" (that is a card, matched by isCardProduct).
 */
export function isRainVirtualAccountProduct(productName: string | undefined): boolean {
  const t = norm(productName);
  return /virtual account|virtual iban|\bviban\b/.test(t);
}

/** True if a country is on the Rain card-spending prohibition list (§II.A). */
export function isRainSpendingProhibited(country: string | undefined): boolean {
  return SPENDING_SET.has(norm(country));
}

function keywordHit(text: string | undefined, keywords: string[]): string | undefined {
  const t = norm(text);
  if (!t) return undefined;
  return keywords.find((k) => t.includes(norm(k)));
}

/** Returns the matched keyword if the declared business is a Rain-prohibited type (§I.B/§III.B), else undefined. */
export function rainProhibitedBusinessHit(text: string | undefined): string | undefined {
  return keywordHit(text, RAIN_PROHIBITED_BUSINESS_KEYWORDS);
}

/** Returns the matched keyword if the declared business is a Rain enhanced-review type (§I.C), else undefined. */
export function rainEnhancedReviewBusinessHit(text: string | undefined): string | undefined {
  return keywordHit(text, RAIN_ENHANCED_REVIEW_BUSINESS_KEYWORDS);
}
