/**
 * Rain USD card — launch-market eligibility (Global Account / US perimeter).
 *
 * Product rule (Global GTM feature roadmap): the USD card is issued by Rain and is live only
 * in the launch markets below. A customer may hold a card ONLY IF resident in one of these
 * jurisdictions (operating jurisdiction for entities). Every market still gets a USD account +
 * payout (Thunes); the card is the gated product. The "coming soon" markets have account + payout
 * live with cards to follow — they are NOT card-eligible yet.
 *
 * This is a product-availability rule, not a financial-crime risk score — enforced at the data-
 * quality / eligibility gate. US perimeter only; Mal Bank (UAE) has its own card programme.
 */

/** Card issuer of record for the Global Account USD card. */
export const CARD_ISSUER = "Rain";

/** Card-live launch markets — residents here may hold a Rain USD card (country names match countries.json). */
export const RAIN_CARD_MARKETS: string[] = [
  "Pakistan",
  "United Arab Emirates",
  "Singapore",
  "Malaysia",
  "Philippines",
  "Egypt",
  "Bangladesh",
  "Morocco",
];

/** Account + payout live, card to follow — NOT yet card-eligible (documentation / roadmap). */
export const CARD_COMING_SOON_MARKETS: string[] = [
  "Saudi Arabia",
  "Turkey",
  "Indonesia",
  "Qatar",
  "Kuwait",
  "Bahrain",
  "Oman",
  "Jordan",
  "Algeria",
  "Tunisia",
];

const norm = (s: string | undefined): string => (s ?? "").trim().toLowerCase();

const CARD_MARKET_SET = new Set(RAIN_CARD_MARKETS.map(norm));

/** True if a residence / operating jurisdiction is a Rain card launch market. */
export function isRainCardMarket(country: string | undefined): boolean {
  return CARD_MARKET_SET.has(norm(country));
}

/**
 * True if a declared product is a card product (Debit Card, Credit / Virtual Card, …).
 * Product names come from the master registry; none of the non-card products contain "card".
 */
export function isCardProduct(productName: string | undefined): boolean {
  return /\bcard\b/i.test(productName ?? "");
}
