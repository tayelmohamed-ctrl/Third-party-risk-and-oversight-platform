/**
 * US Methodology §7.1 — corridor-based geography model for Global Account (US BaaS perimeter).
 *
 * Geography scoring is driven by funds-flow / corridor concentration only.
 * Customer nationality, country of birth, and residence play NO role (US Methodology §7.1).
 *
 * INTERIM COMPENSATING CONTROL — B-1 (effective 2026-07-05, expires 2026-12-31):
 * Until the full corridor tier register is implemented, any counterparty jurisdiction on the
 * FATF increased-monitoring list (grey list) or call-for-action list (black list) receives a
 * minimum firm floor of 2.0 (Medium) on geography.  This replaces the undocumented additive
 * uplift (+0.45) that was removed in Round 1 (P2-US-2).
 * This floor is conservative (not additive), clearly documented, and will be superseded by
 * the full corridor tier register when B-1 is fully wired.
 *
 * TODO(B-1 — due 2026-12-31): replace this Set-based floor with a corridor-tier lookup table
 * built from beneficiary/payer counterparty jurisdictions, corridor concentration/velocity
 * metrics, and geolocation coherence checks per US Methodology §7.1.
 */

// FATF increased-monitoring (grey list) — source: FATF plenary June 2025, reflected in country_risk_full.json
// fatf score 2 = increased monitoring / grey list
export const FATF_GREY_LIST = new Set<string>([
  "Algeria",
  "Angola",
  "Bolivia",
  "British Virgin Islands",
  "Bulgaria",
  "Cameroon",
  "Cote D'Ivoire",
  "Democratic Republic of the Congo",
  "Haiti",
  "Kenya",
  "Laos",
  "Lebanon",
  "Monaco",
  "Namibia",
  "Nepal",
  "South Sudan",
  "Syria",
  "Venezuela",
  "Vietnam",
  "Western Sahara",
  "Yemen",
  // Territorial anomaly in source data — included conservatively:
  "Aland Islands",
]);

// FATF call-for-action (black list) — source: FATF plenary June 2025
// fatf score 3 = call for action / black list
export const FATF_BLACK_LIST = new Set<string>([
  "Iran",
  "Myanmar",
  "North Korea",
]);

/**
 * Interim firm floor for FATF-listed jurisdictions (Global Account perimeter only).
 * Firm score 2.0 → Score 2 (Medium) via firmToScore.
 * This is a floor, not an additive: max(existing, FATF_INTERIM_FIRM_FLOOR).
 *
 * B-1 INTERIM — expires 2026-12-31. Replace with corridor tier table when wired.
 */
export const FATF_INTERIM_FIRM_FLOOR = 2.0;

/** True if the jurisdiction is on any active FATF list (grey or black). */
export function isFatfListed(countryName: string): boolean {
  if (!countryName) return false;
  const norm = countryName.trim();
  return FATF_GREY_LIST.has(norm) || FATF_BLACK_LIST.has(norm);
}

/** True if jurisdiction is on FATF call-for-action (black list). */
export function isFatfBlackListed(countryName: string): boolean {
  if (!countryName) return false;
  return FATF_BLACK_LIST.has(countryName.trim());
}

/**
 * B-1 Corridor tier structure — PLACEHOLDER, to be populated with full register.
 * Source: US Methodology §7.1
 *
 * TODO(B-1 — due 2026-12-31): implement full corridor register with:
 *   - Beneficiary and payer counterparty jurisdictions
 *   - Corridor concentration / velocity metrics
 *   - Geolocation coherence check
 *   - Sanctioned-jurisdiction access as hard override (not weighted input)
 */
export type CorridorTier = "low" | "medium" | "high" | "very_high";

export interface CorridorTierEntry {
  corridor: string;   // e.g. "US → Kenya"
  tier: CorridorTier;
  firmFloor: number;  // firm score (0–4) — minimum for this corridor
  rationale: string;
  reviewDate: string; // ISO date — when this entry was last reviewed
}

// Interim mitigant live — full B-1 corridor register still open, expires 2026-12-31.
export const US_CORRIDOR_TIER_REGISTER: CorridorTierEntry[] = [];

/** Resolve firm floor for a given counterparty jurisdiction under the interim B-1 model. */
export function interimUsFirmFloor(countryName: string): number {
  if (!countryName) return 0;
  if (isFatfListed(countryName)) return FATF_INTERIM_FIRM_FLOOR;
  return 0;
}
