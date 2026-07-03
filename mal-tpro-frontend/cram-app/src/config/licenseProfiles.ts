/**
 * Mal license profiles — regulations apply per active license path.
 * UAE: Community bank (CBUAE) · US: MSB BaaS under Zenus Bank (Puerto Rico / FinCEN).
 */
export type LicenseProfileId = "UAE_COMMUNITY_BANK" | "US_MSB_BAAS_ZENUS" | "GROUP";

export interface LicenseProfile {
  id: LicenseProfileId;
  label: string;
  regulator: string;
  sponsorBank?: string;
  fiu: string;
  status: "active" | "application" | "planned";
  description: string;
}

export const LICENSE_PROFILES: LicenseProfile[] = [
  {
    id: "UAE_COMMUNITY_BANK",
    label: "UAE Community Bank",
    regulator: "Central Bank of the UAE (CBUAE)",
    fiu: "UAE FIU · goAML",
    status: "application",
    description: "Full-stack UAE banking licence — CBUAE AML/CFT Rulebook, notices, and FIU reporting.",
  },
  {
    id: "US_MSB_BAAS_ZENUS",
    label: "US MSB · BaaS (Zenus Bank)",
    regulator: "FinCEN · OFAC · Puerto Rico OCIF (sponsor)",
    sponsorBank: "Zenus Bank",
    fiu: "FinCEN BSA E-File",
    status: "active",
    description: "US money-services / BaaS programme under Zenus sponsor bank — BSA, MSB registration, SAR/CTR, OFAC.",
  },
  {
    id: "GROUP",
    label: "Group-wide (Mal policy)",
    regulator: "Mal Board · Group MLRO",
    fiu: "Dual FIU routing",
    status: "active",
    description: "Internal AML/CFT policy, FATF alignment, and enterprise-wide obligations applying to all entities.",
  },
];

export const ACTIVE_LICENSE_PROFILES: LicenseProfileId[] = [
  "UAE_COMMUNITY_BANK",
  "US_MSB_BAAS_ZENUS",
  "GROUP",
];
