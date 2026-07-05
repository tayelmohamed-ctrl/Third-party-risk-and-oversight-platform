/**
 * Authoritative regulatory sources Sayed monitors weekly.
 * Each source maps to catalogue regulation IDs and license profile(s).
 */
import type { LicenseProfileId } from "./licenseProfiles";
import type { CompliancePerimeter } from "./perimeters";
import { licenseProfileForPerimeter } from "./perimeters";

export type RegulatorySourceCheckMethod = "http-head" | "http-get-hash";
export type RegulatorySourceChannel = "rss-primary" | "drive-version" | "http-backup";

export interface RegulatorySource {
  id: string;
  name: string;
  publisher: string;
  url: string;
  checkMethod: RegulatorySourceCheckMethod;
  primaryChannel: RegulatorySourceChannel;
  /** ISO 8601 duration hint for human docs — enforced by weekly cron */
  checkCadence: "weekly";
  licenseProfiles: LicenseProfileId[];
  /** Links to cram_lineage_catalogue.json regulation IDs */
  regulationIds: string[];
  /** Optional CSS selector / keyword hints for change detection narrative */
  changeHints?: string[];
}

export interface RegulatoryRssFeed {
  id: string;
  name: string;
  publisher: string;
  url: string;
  licenseProfiles: LicenseProfileId[];
  regulationIds: string[];
}

/** Tier-1 RSS feeds — primary change detection (HTTP hash is backup). */
export const REGULATORY_RSS_FEEDS: RegulatoryRssFeed[] = [
  {
    id: "RSS-CBUAE",
    name: "CBUAE — Circulars & notices (RSS)",
    publisher: "Central Bank of the UAE",
    url: "https://www.centralbank.ae/en/rss-feeds/rss.ashx?type=circulars",
    licenseProfiles: ["UAE_COMMUNITY_BANK"],
    regulationIds: ["REG-CBUAE-AML", "REG-CBUAE-STR-3354", "REG-CBUAE-2026-14", "REG-CBUAE-TM"],
  },
  {
    id: "RSS-FINCEN",
    name: "FinCEN — News & updates (RSS)",
    publisher: "FinCEN · US Treasury",
    url: "https://www.fincen.gov/news/rss.xml",
    licenseProfiles: ["US_MSB_BAAS_ZENUS"],
    regulationIds: ["REG-US-BSA", "REG-US-MSB", "REG-US-SAR", "REG-US-CTR", "REG-US-CDD"],
  },
];

export const SAYED_REGULATORY_MONITOR = {
  agent: "sayed" as const,
  cadence: "weekly",
  /** Cron: Monday 05:00 UTC ≈ 09:00 UAE */
  cronUtc: "0 5 * * 1",
  demoCron: "0 */6 * * *",
  owner: "Sayed — Regulatory & Risk Intelligence",
} as const;

export const REGULATORY_SOURCES: RegulatorySource[] = [
  {
    id: "SRC-CBUAE-RULEBOOK-AML",
    name: "CBUAE AML/CFT Rulebook",
    publisher: "Central Bank of the UAE",
    url: "https://rulebook.centralbank.ae/en/rulebook/anti-money-laundering-and-combating-financing-terrorism-0",
    checkMethod: "http-get-hash",
    primaryChannel: "http-backup",
    checkCadence: "weekly",
    licenseProfiles: ["UAE_COMMUNITY_BANK", "GROUP"],
    regulationIds: ["REG-CBUAE-AML", "REG-UAE-AML-LAW"],
    changeHints: ["CDD", "EDD", "STR", "TM", "sanctions"],
  },
  {
    id: "SRC-CBUAE-CIRCULARS",
    name: "CBUAE Circulars & Notices",
    publisher: "Central Bank of the UAE",
    url: "https://centralbank.ae/en/circulars-and-notices",
    checkMethod: "http-get-hash",
    primaryChannel: "http-backup",
    checkCadence: "weekly",
    licenseProfiles: ["UAE_COMMUNITY_BANK"],
    regulationIds: ["REG-CBUAE-AML", "REG-CBUAE-STR-3354", "REG-CBUAE-2026-14", "REG-CBUAE-TM"],
    changeHints: ["Notice", "Circular", "AML", "VASP", "travel rule"],
  },
  {
    id: "SRC-UAE-FIU-GOAML",
    name: "UAE FIU · goAML guidance",
    publisher: "UAE Financial Intelligence Unit",
    url: "https://www.uaefiu.gov.ae/en/goaml",
    checkMethod: "http-get-hash",
    primaryChannel: "http-backup",
    checkCadence: "weekly",
    licenseProfiles: ["UAE_COMMUNITY_BANK"],
    regulationIds: ["REG-CBUAE-STR-3354", "REG-CBUAE-AML"],
    changeHints: ["STR", "SAR", "goAML", "RFI"],
  },
  {
    id: "SRC-FATF-RECOMMENDATIONS",
    name: "FATF Recommendations & guidance",
    publisher: "Financial Action Task Force",
    url: "https://www.fatf-gafi.org/en/publications/Fatfrecommendations/Fatf-recommendations.html",
    checkMethod: "http-get-hash",
    primaryChannel: "http-backup",
    checkCadence: "weekly",
    licenseProfiles: ["GROUP", "UAE_COMMUNITY_BANK", "US_MSB_BAAS_ZENUS"],
    regulationIds: ["REG-FATF-R10", "REG-FATF-R6", "REG-FATF-R20"],
    changeHints: ["Recommendation", "RBA", "CDD", "TFS", "reporting"],
  },
  {
    id: "SRC-FATF-UAE-MER",
    name: "FATF UAE mutual evaluation follow-up",
    publisher: "FATF / MENAFATF",
    url: "https://www.fatf-gafi.org/en/countries/detail/United-Arab-Emirates.html",
    checkMethod: "http-get-hash",
    primaryChannel: "http-backup",
    checkCadence: "weekly",
    licenseProfiles: ["UAE_COMMUNITY_BANK", "GROUP"],
    regulationIds: ["REG-CBUAE-AML"],
    changeHints: ["follow-up", "MER", "technical compliance"],
  },
  {
    id: "SRC-FINCEN-MSB",
    name: "FinCEN MSB registration & BSA program",
    publisher: "FinCEN · US Treasury",
    url: "https://www.fincen.gov/money-services-business-msb-registration",
    checkMethod: "http-get-hash",
    primaryChannel: "http-backup",
    checkCadence: "weekly",
    licenseProfiles: ["US_MSB_BAAS_ZENUS"],
    regulationIds: ["REG-US-BSA", "REG-US-MSB", "REG-US-BSA-PROGRAM"],
    changeHints: ["MSB", "registration", "renewal", "BSA"],
  },
  {
    id: "SRC-FINCEN-REGS",
    name: "FinCEN statutes & regulations (31 CFR)",
    publisher: "FinCEN",
    url: "https://www.fincen.gov/resources/statutes-and-regulations",
    checkMethod: "http-get-hash",
    primaryChannel: "http-backup",
    checkCadence: "weekly",
    licenseProfiles: ["US_MSB_BAAS_ZENUS"],
    regulationIds: ["REG-US-BSA", "REG-US-SAR", "REG-US-CTR", "REG-US-CDD"],
    changeHints: ["SAR", "CTR", "CDD", "CIP", "beneficial ownership"],
  },
  {
    id: "SRC-OFAC-SDN",
    name: "OFAC sanctions programs & SDN",
    publisher: "US Treasury · OFAC",
    url: "https://ofac.treasury.gov/sanctions-programs-and-country-information",
    checkMethod: "http-get-hash",
    primaryChannel: "http-backup",
    checkCadence: "weekly",
    licenseProfiles: ["US_MSB_BAAS_ZENUS", "GROUP"],
    regulationIds: ["REG-US-OFAC", "REG-FATF-R6"],
    changeHints: ["SDN", "program", "sectoral", "Russia", "Iran"],
  },
  {
    id: "SRC-FFIEC-BSA",
    name: "FFIEC BSA/AML examination manual",
    publisher: "FFIEC",
    url: "https://bsaaml.ffiec.gov/manual",
    checkMethod: "http-get-hash",
    primaryChannel: "http-backup",
    checkCadence: "weekly",
    licenseProfiles: ["US_MSB_BAAS_ZENUS"],
    regulationIds: ["REG-US-BSA", "REG-US-BSA-PROGRAM"],
    changeHints: ["MSB", "money services", "BaaS", "sponsor bank"],
  },
  {
    id: "SRC-ZENUS-PARTNER",
    name: "Zenus Bank BaaS compliance addendum",
    publisher: "Zenus Bank (sponsor) · Mal Drive",
    url: "https://drive.google.com/drive/folders/0ABopRvbIQ6pFUk9PVA",
    checkMethod: "http-head",
    primaryChannel: "drive-version",
    checkCadence: "weekly",
    licenseProfiles: ["US_MSB_BAAS_ZENUS"],
    regulationIds: ["REG-ZENUS-BAAS", "REG-US-BSA-PROGRAM"],
    changeHints: ["sponsor", "BaaS agreement", "AML addendum", "OCC", "OCIF"],
  },
  {
    id: "SRC-WOLFSBERG",
    name: "Wolfsberg Group correspondence banking principles",
    publisher: "Wolfsberg Group",
    url: "https://www.wolfsberg-principles.com/",
    checkMethod: "http-get-hash",
    primaryChannel: "http-backup",
    checkCadence: "weekly",
    licenseProfiles: ["GROUP", "UAE_COMMUNITY_BANK"],
    regulationIds: ["REG-WOLFSBERG"],
    changeHints: ["correspondent", "KYC", "payment transparency"],
  },
  {
    id: "SRC-UAE-TFS",
    name: "UAE Executive Office · Targeted financial sanctions",
    publisher: "UAE Executive Office for Control & Non-Proliferation",
    url: "https://www.uaeiec.gov.ae/en-us",
    checkMethod: "http-get-hash",
    primaryChannel: "http-backup",
    checkCadence: "weekly",
    licenseProfiles: ["UAE_COMMUNITY_BANK"],
    regulationIds: ["REG-UAE-TFS", "REG-FATF-R6"],
    changeHints: ["local list", "terrorist", "freeze", "designation"],
  },
];

export function rssFeedsForLicense(profile: LicenseProfileId): RegulatoryRssFeed[] {
  return REGULATORY_RSS_FEEDS.filter((f) => f.licenseProfiles.includes(profile) || f.licenseProfiles.includes("GROUP"));
}

export function sourcesForLicense(profile: LicenseProfileId): RegulatorySource[] {
  return REGULATORY_SOURCES.filter((s) => s.licenseProfiles.includes(profile) || s.licenseProfiles.includes("GROUP"));
}

export function sourcesForPerimeter(perimeter: CompliancePerimeter): RegulatorySource[] {
  return sourcesForLicense(licenseProfileForPerimeter(perimeter));
}

export function sourceById(id: string): RegulatorySource | undefined {
  return REGULATORY_SOURCES.find((s) => s.id === id);
}
