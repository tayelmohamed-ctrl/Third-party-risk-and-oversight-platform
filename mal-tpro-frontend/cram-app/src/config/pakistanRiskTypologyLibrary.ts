import library from "../data/pakistan_risk_typology_library.json";
import type { AgentId } from "./agents";

export type TypologySeverity = "Critical" | "High" | "Medium" | "Low";
export type TypologyCategory = "ML" | "TF" | "Sanctions" | "PF";

export type MalTypologyEntry = {
  id: string;
  rank: number;
  name: string;
  category: TypologyCategory;
  severity: TypologySeverity;
  corridorRelevance: string;
  description: string;
  indicators: string[];
  primaryControls: string[];
  oscilarRules: string[];
  primaryOscilarRule?: string;
  source: string;
};

export type PakistanRiskTypologyLibrary = {
  version: string;
  published: string;
  countryCode: string;
  countryName: string;
  ownerAgent: AgentId;
  typologyAgent: AgentId;
  section: string;
  classification: string;
  sources: { id: string; title: string; authority: string; driveDoc: string; status?: string }[];
  corridorRatings: { corridorId: string; label: string; likelihoodImpactScore: number; rating: string; register: string; relevance: string }[];
  nra2023: {
    contextFactors: string[];
    predicateOffencesVeryHigh: string[];
    predicateOffencesHigh: string[];
    mlChannels: string[];
    tfSourcesVeryHigh: string[];
    tfSourcesHigh: string[];
    tfChannelsVeryHigh: string[];
    tfChannelsHigh: string[];
    sectorVulnerabilitiesVeryHigh: string[];
    sectorVulnerabilitiesHigh: string[];
    npoRiskProfile: string;
  };
  complianceModule: {
    documentId: string;
    legalBasis: string[];
    supervisors: { code: string; name: string; role: string }[];
    ctrThreshold: string;
    recordRetentionYears: number;
    acceptableId: string[];
    eddTriggers: string[];
    mandatoryFields: string[];
    jurisdictionTypologies: string[];
    fatfNote: string;
  };
  malTypologyCorpus: MalTypologyEntry[];
  redFlags: string[];
  nonDiscriminationPolicy: string;
};

export const PAKISTAN_RISK_TYPOLOGY_LIBRARY = library as PakistanRiskTypologyLibrary;

export function severityColor(severity: TypologySeverity): string {
  if (severity === "Critical") return "#FF5C77";
  if (severity === "High") return "#F6A623";
  if (severity === "Medium") return "#39B9ED";
  return "#2FD8A6";
}

export function severityStars(severity: TypologySeverity): number {
  if (severity === "Critical") return 5;
  if (severity === "High") return 4;
  if (severity === "Medium") return 3;
  return 2;
}

export function categoryIcon(category: TypologyCategory): string {
  if (category === "TF") return "⚠️";
  if (category === "Sanctions") return "🚫";
  if (category === "PF") return "☢️";
  return "💰";
}

export function typologiesByCategory(category: TypologyCategory | "all"): MalTypologyEntry[] {
  const list = PAKISTAN_RISK_TYPOLOGY_LIBRARY.malTypologyCorpus;
  if (category === "all") return list;
  return list.filter((t) => t.category === category);
}

export function typologiesWithOscilarRules(): MalTypologyEntry[] {
  return PAKISTAN_RISK_TYPOLOGY_LIBRARY.malTypologyCorpus.filter((t) => t.oscilarRules.length > 0);
}

export function tmCoveragePct(): number {
  const total = PAKISTAN_RISK_TYPOLOGY_LIBRARY.malTypologyCorpus.length;
  const covered = typologiesWithOscilarRules().length;
  return Math.round((covered / total) * 100);
}

export function allPakistanOscilarRuleIds(): string[] {
  const ids = new Set<string>();
  for (const t of PAKISTAN_RISK_TYPOLOGY_LIBRARY.malTypologyCorpus) {
    for (const r of t.oscilarRules) ids.add(r);
  }
  return [...ids].sort();
}

export const LIBRARY_OWNER_AGENT: AgentId = PAKISTAN_RISK_TYPOLOGY_LIBRARY.ownerAgent;
export const LIBRARY_TYPOLOGY_AGENT: AgentId = PAKISTAN_RISK_TYPOLOGY_LIBRARY.typologyAgent;
