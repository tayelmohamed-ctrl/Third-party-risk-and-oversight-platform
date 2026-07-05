/**
 * Perimeter-aware country firm scores — UAE (mal_bank) vs US (global_account).
 * Base library: countries.json · sanctions floors · US NRA / FATF adjustments.
 */
import type { CompliancePerimeter } from "./perimeters";
import {
  applySanctionsCountryFloor,
  firmScoreToBand,
  normalizeCountryName,
  sanctionsFloorForCountry,
  type SanctionsCountryFloor,
} from "./sanctionsCountryRegistry";

/** FATF increased monitoring — US treats grey-list more conservatively than domestic UAE view. */
const US_FATF_GREY_UPLIFT = 0.45;

const US_FATF_GREY_COUNTRIES = new Set([
  "algeria", "angola", "bolivia", "bulgaria", "cameroon", "cote d'ivoire",
  "democratic republic of the congo", "haiti", "kenya", "laos", "lebanon",
  "monaco", "mozambique", "namibia", "nepal", "nigeria", "south africa",
  "south sudan", "venezuela", "vietnam", "yemen",
]);

/** US NRA 2022 high-priority jurisdictions — additional inherent uplift. */
const US_NRA_HIGH = new Set([
  "afghanistan", "myanmar", "iran", "north korea", "syria", "russia", "cuba",
  "venezuela", "yemen", "somalia", "sudan", "south sudan", "libya", "iraq",
  "lebanon", "nicaragua", "belarus", "zimbabwe",
]);

function countryKey(name: string): string {
  return normalizeCountryName(name).toLowerCase();
}

function sanctionsFloorForPerimeter(
  name: string,
  perimeter: CompliancePerimeter,
): SanctionsCountryFloor | undefined {
  const floor = sanctionsFloorForCountry(name);
  if (!floor) return undefined;
  if (perimeter === "mal_bank") return floor;
  // Global Account — OFAC / UN programmes only (exclude UAE-only TFS-only floors)
  if (floor.sources.some((s) => s === "US_OFAC" || s === "UN")) return floor;
  return undefined;
}

function applyMalBankFirm(countryName: string, baseFirm: number): number {
  return applySanctionsCountryFloor(countryName, baseFirm);
}

function applyGlobalAccountFirm(countryName: string, baseFirm: number): number {
  let firm = baseFirm;
  const key = countryKey(countryName);

  if (US_NRA_HIGH.has(key)) {
    firm = Math.max(firm, 3);
  }
  if (US_FATF_GREY_COUNTRIES.has(key)) {
    firm = Math.min(4, firm + US_FATF_GREY_UPLIFT);
  }

  const floor = sanctionsFloorForPerimeter(countryName, "global_account");
  if (floor) {
    firm = Math.max(firm, floor.firmFloor);
  }

  return firm;
}

/** Resolve firm score (0–4 scale) for a country under the active regulatory perimeter. */
export function applyPerimeterCountryFirm(
  countryName: string,
  baseFirm: number,
  perimeter: CompliancePerimeter,
): number {
  if (!countryName) return baseFirm;
  return perimeter === "global_account"
    ? applyGlobalAccountFirm(countryName, baseFirm)
    : applyMalBankFirm(countryName, baseFirm);
}

export function perimeterCountryBand(firm: number): string {
  return firmScoreToBand(firm);
}

export function perimeterLabelForCountryLookup(perimeter: CompliancePerimeter): string {
  return perimeter === "mal_bank" ? "UAE NRA · CBUAE" : "US NRA 2022 · FinCEN/OFAC";
}
