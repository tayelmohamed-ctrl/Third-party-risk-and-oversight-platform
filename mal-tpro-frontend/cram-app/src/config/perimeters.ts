/** Compliance perimeters — Global Account (MSB/BaaS) vs MAL Bank (CBUAE). */
export type CompliancePerimeter = "global_account" | "mal_bank";
export type CustomerTypeFilter = "all" | "individual" | "sme";
export type CorridorFilter = "all" | "UAE" | "PK" | "EG" | "BD" | "US" | "DE";

export interface PerimeterDefinition {
  id: CompliancePerimeter;
  label: string;
  subtitle: string;
  licenseRegions: ("UAE" | "US")[];
  approverLabel: string;
  templateSet: string;
}

export const PERIMETERS: Record<CompliancePerimeter, PerimeterDefinition> = {
  global_account: {
    id: "global_account",
    label: "Global Account",
    subtitle: "MSB / BaaS · Zenus · Rain · SwiftX",
    licenseRegions: ["US"],
    approverLabel: "US CO / MLRO",
    templateSet: "FinCEN SAR · CTR · Partner RFI",
  },
  mal_bank: {
    id: "mal_bank",
    label: "MAL Bank",
    subtitle: "CBUAE-regulated · UAE rulebook · exam readiness",
    licenseRegions: ["UAE"],
    approverLabel: "MLRO / Board",
    templateSet: "goAML STR · CBUAE returns · Exam pack",
  },
};

export const CORRIDOR_OPTIONS: { id: CorridorFilter; label: string }[] = [
  { id: "all", label: "All corridors" },
  { id: "UAE", label: "UAE" },
  { id: "PK", label: "PK" },
  { id: "EG", label: "EG" },
  { id: "BD", label: "BD" },
  { id: "US", label: "US" },
  { id: "DE", label: "DE" },
];

/** MAL Bank — CBUAE domestic; UAE customers and inbound/outbound UAE leg only. */
export const MAL_BANK_CORRIDOR_IDS: CorridorFilter[] = ["all", "UAE"];

/** Global Account — MSB/BaaS partner corridors (no UAE domestic filter). */
export const GLOBAL_ACCOUNT_CORRIDOR_IDS: CorridorFilter[] = ["all", "US", "PK", "EG", "BD", "DE"];

export function corridorOptionsForPerimeter(perimeter: CompliancePerimeter): { id: CorridorFilter; label: string }[] {
  const allowed = perimeter === "mal_bank" ? MAL_BANK_CORRIDOR_IDS : GLOBAL_ACCOUNT_CORRIDOR_IDS;
  return CORRIDOR_OPTIONS.filter((c) => allowed.includes(c.id));
}

export function isCorridorValidForPerimeter(perimeter: CompliancePerimeter, corridor: CorridorFilter): boolean {
  const allowed = perimeter === "mal_bank" ? MAL_BANK_CORRIDOR_IDS : GLOBAL_ACCOUNT_CORRIDOR_IDS;
  return allowed.includes(corridor);
}

export function regionForPerimeter(p: CompliancePerimeter): "UAE" | "US" {
  return p === "mal_bank" ? "UAE" : "US";
}

export function perimeterFromLicenseRegion(region: string | null | undefined): CompliancePerimeter {
  if (region === "US") return "global_account";
  return "mal_bank";
}

export function licenseProfileForPerimeter(perimeter: CompliancePerimeter): import("./licenseProfiles").LicenseProfileId {
  return perimeter === "mal_bank" ? "UAE_COMMUNITY_BANK" : "US_MSB_BAAS_ZENUS";
}

export function matchesPerimeter(
  perimeter: CompliancePerimeter,
  licenseRegion: string | null | undefined,
): boolean {
  const def = PERIMETERS[perimeter];
  if (!licenseRegion) return perimeter === "mal_bank";
  return def.licenseRegions.includes(licenseRegion as "UAE" | "US");
}
