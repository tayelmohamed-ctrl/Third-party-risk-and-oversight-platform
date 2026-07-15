/**
 * Zenus / Global Account (US perimeter) business-type acceptance registry.
 * Source: Mal-CRAM-US-01 v1.0 (CRAM-US-2026-07-FREEZE-03) §6.4, reconciled with
 * the Mal CRAM override taxonomy (OVR-002/005/006/007) under the
 * most-restrictive-standard rule.
 *
 * This is the authoritative US-perimeter list. It is deliberately separate from
 * the shared nature-of-business library (data/nature_of_business.json), which is
 * not perimeter-split — several categories that are High (3) for Mal Bank are
 * outright PROHIBITED on the Zenus US rails (e.g. DPMS/jewelry, third-party
 * payment processors, prepaid access). Entity onboarding on the US perimeter
 * screens against this list; a match is an override outcome (reject/exit), not a
 * weighted score.
 */

/** §6.4 — prohibited on Zenus rails (override outcome: reject / exit). */
export const ZENUS_PROHIBITED_BUSINESS_TYPES: string[] = [
  "Lawyers (IOLTA accounts), notaries, trustees, accountants",
  "Offshore banks",
  "Domestic correspondent accounts",
  "Payable-through accounts",
  "Concentration accounts",
  "Liquor stores, convenience stores, restaurants",
  "Gaming, casinos, gambling",
  "Arms and ammunition",
  // NOTE (FREEZE-03 taxonomy): DPMS / jewellery is NOT a blanket knock-out. It is profession-risk 4
  // (High) under CRAM §5.1 and only prohibited where the specific declared type is caught by the
  // Zenus prohibited-list catch-all (A3.5). De-escalated from OVR-002 to nature-of-business High.
  "Deposit brokers; brokered deposits",
  "Cannabis-related businesses (federal-law conflict)",
  "Bulk shipments of currency; U.S. dollar drafts",
  "Prepaid access",
  "Third-party payment processors",
  "Independent ATM owners/operators",
  "Non-deposit investment products",
  "Trust and asset-management services",
  "Real estate; construction",
  "Shell banks; unregistered/unlicensed MSBs; anonymous or bearer-like products",
];

/**
 * §6.4 — permitted as GA end-users ONLY, subject to EDD, valid licensing and an
 * evidenced compliance program (each floors High pending EDD clearance under §6.3).
 */
export const ZENUS_PERMITTED_WITH_EDD: string[] = [
  "Regulated institutions (MSBs, EMIs, VASPs, PMIs)",
  "Commercial banks",
  "Broker-dealers",
  "Crypto exchanges",
  "Insurance companies",
  "Non-profit organisations and charities (NPO/charity connection = automatic EDD trigger)",
  "Government / embassy / supranational entities",
];

/** Keyword index for lightweight matching of declared activity text. */
const PROHIBITED_KEYWORDS: string[] = [
  "iolta", "notary", "notaries", "trustee", "accountant",
  "offshore bank", "correspondent account", "payable-through", "payable through", "concentration account",
  "liquor", "convenience store", "restaurant",
  "gaming", "casino", "gambling",
  "arms", "ammunition", "firearm",
  // DPMS/jewellery keywords intentionally removed — DPMS is profession-risk 4 (High), not a
  // knock-out, unless a specific declared type is caught by the Zenus A3.5 catch-all (FREEZE-03).
  "deposit broker", "brokered deposit",
  "cannabis", "marijuana", "hemp",
  "bulk currency", "bulk cash", "dollar draft",
  "prepaid access", "prepaid card",
  "third-party payment processor", "third party payment processor", "payment processor",
  "atm owner", "atm operator", "independent atm",
  "non-deposit investment",
  "trust and asset", "asset-management", "asset management",
  "real estate", "construction",
  "shell bank", "unregistered msb", "unlicensed msb", "bearer",
];

/** True if declared business activity/type text matches a Zenus-prohibited category. */
export function isZenusProhibitedBusiness(text: string | undefined): boolean {
  if (!text) return false;
  const t = text.toLowerCase();
  return PROHIBITED_KEYWORDS.some((k) => t.includes(k));
}

export const ZENUS_BUSINESS_META = {
  source: "Mal-CRAM-US-01 v1.0 · CRAM-US-2026-07-FREEZE-03 §6.4",
  perimeter: "global_account",
  overrideRefs: ["OVR-002", "OVR-005", "OVR-006", "OVR-007"],
} as const;
