/**
 * Perimeter-aware country firm scores — UAE (mal_bank) vs US (global_account).
 * Base library: countries.json · sanctions floors.
 *
 * P2-US-1: US geography is scored on funds-flow / corridor concentration, NOT on customer
 * nationality, country of birth, or residence (US Methodology §7.1). The nationality-based
 * firm-floor approach has been removed from the global_account code path.
 *
 * P2-US-2: The undocumented +0.45 FATF grey-list additive uplift has been removed.
 * FATF status feeds into the corridor-tier classification (§7.1), not a bare score addition.
 *
 * B-1 — Interim mitigant live — full B-1 corridor register still open, expires 2026-12-31.
 * FATF grey/black-list jurisdictions receive a minimum firm floor of 2.0 (Medium) under
 * Global Account. Conservative floor (not additive), superseded when full corridor
 * tier register is wired per US Methodology §7.1. See usCorridorRisk.ts.
 */
import type { CompliancePerimeter } from "./perimeters";
import {
  applySanctionsCountryFloor,
  firmScoreToBand,
  normalizeCountryName,
  sanctionsFloorForCountry,
  type SanctionsCountryFloor,
} from "./sanctionsCountryRegistry";
import { interimUsFirmFloor } from "./usCorridorRisk";
import { zenusCountryFirmFloor } from "./zenusRestrictedCountries";

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
  // Global Account — OFAC / UN programmes only (exclude UAE TFS-only floors)
  // US Methodology §7.1: only OFAC/UN nexus applies; UAE TFS is not a US programme
  if (floor.sources.some((s) => s === "US_OFAC" || s === "UN")) return floor;
  return undefined;
}

function applyMalBankFirm(countryName: string, baseFirm: number): number {
  // UAE Methodology: full Cat A/B/C sanctions floors including UAE TFS
  return applySanctionsCountryFloor(countryName, baseFirm);
}

function applyGlobalAccountFirm(countryName: string, baseFirm: number): number {
  let firm = baseFirm;
  // P2-US-1: nationality / NRA-high-list firm floor removed — US geography is corridor-based.
  // P2-US-2: +0.45 FATF grey-list additive uplift removed — not documented in US Methodology.
  // B-1 INTERIM (expires 2026-12-31): FATF grey/black-list → minimum firm floor of 2.0 (Medium).
  // This is a conservative floor (not additive) pending full corridor tier register (usCorridorRisk.ts).
  firm = Math.max(firm, interimUsFirmFloor(countryName));
  // OFAC/UN sanctions floors (appropriate as financial-nexus, not nationality)
  const floor = sanctionsFloorForPerimeter(countryName, "global_account");
  if (floor) {
    firm = Math.max(firm, floor.firmFloor);
  }
  // US Methodology §7.1–7.2 — Zenus Restricted Country Codes (US perimeter only):
  // prohibited class floors to Prohibited (4); restricted-conditional class floors to High (3).
  firm = Math.max(firm, zenusCountryFirmFloor(countryName));
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
  // P2-US-3: updated to 2026 NRAs (NMLRA/NTFRA/NPFRA) — US Methodology citation
  return perimeter === "mal_bank" ? "UAE NRA · CBUAE" : "US NRA 2026 · FinCEN/OFAC";
}
