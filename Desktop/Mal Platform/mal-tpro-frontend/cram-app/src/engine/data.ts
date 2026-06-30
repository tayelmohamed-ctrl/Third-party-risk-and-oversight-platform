// Loads the full seed libraries (251 countries, 736 professions, 830 ISIC, etc.)
// and exposes lookup helpers used by the engine and the Risk Test Bench.
import countries from "../data/countries.json";
import professions from "../data/professions.json";
import nob from "../data/nature_of_business.json";
import isic from "../data/isic.json";
import products from "../data/products.json";
import overrides from "../data/override_rules.json";
import ruleLib from "../data/isic_rule_library.json";

export interface Country { country: string; firm: number; band: string; fatf: number; basel: number; sanctions: number; }
export interface Profession { name: string; score: number; }
export interface Activity { activity: string; score: number; }
export interface Isic { code: string; level: string; title: string; rating: string; score: number; theme: string; }
export interface Product { name: string; baseline: string; }
export interface OverrideRule { id: string; trigger: string; outcome: string; priority: string; }

export const COUNTRIES = countries as Country[];
export const PROFESSIONS = professions as Profession[];
export const NATURE_OF_BUSINESS = nob as Activity[];
export const ISIC = isic as Isic[];
export const PRODUCTS = products as Product[];
export const OVERRIDES = overrides as OverrideRule[];
export const RULE_LIB = (ruleLib as { rules: { rule_id: string; risk_score: string; keyword_regex: string; risk_theme: string }[] }).rules;

// Sanctioned (Category A) countries that prohibit a relationship outright.
export const SANCTIONS_A = ["Iran", "Iran, Islamic Republic of", "North Korea", "Korea, Democratic People's Republic of", "Syria", "Syrian Arab Republic"];

const cMap = new Map(COUNTRIES.map((c) => [c.country.toLowerCase(), c]));
export function lookupCountry(name: string): Country | undefined {
  if (!name) return undefined;
  return cMap.get(name.toLowerCase());
}

export function lookupProfession(name: string): number {
  if (!name) return 2;
  const q = name.toLowerCase();
  const exact = PROFESSIONS.find((p) => p.name.toLowerCase() === q);
  if (exact) return clampScore(exact.score);
  const partial = PROFESSIONS.find((p) => p.name.toLowerCase().includes(q) || q.includes(p.name.toLowerCase().split("/")[0].trim()));
  return partial ? clampScore(partial.score) : 2; // unmapped -> Medium (never Low)
}

export function lookupNatureOfBusiness(name: string): number {
  if (!name) return 2;
  const hit = NATURE_OF_BUSINESS.find((a) => a.activity.toLowerCase() === name.toLowerCase());
  return hit ? clampScore(hit.score) : 2;
}

// ISIC resolution — see activityRisk.ts (full pipeline docs/06)
export { resolveActivity, resolveActivityRisk, resolveProfessionRisk, resolveCustomerTypeActivityScores } from "./activityRisk";
export type { ActivityResolution, ProfessionResolution } from "./activityRisk";

export function clampScore(n: number): number { return Math.max(1, Math.min(3, n)); }

// firm country score (0-4) -> internal 1..3 band score (4 = prohibition handled separately)
export function firmToScore(firm: number): number {
  if (firm >= 4) return 4;
  if (firm > 2.15) return 3;
  if (firm > 1.5) return 2;
  return 1;
}
