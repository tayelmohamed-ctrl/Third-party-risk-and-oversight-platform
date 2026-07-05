/**
 * NRA sector registry — delegates to Master Risk Registry (single source of truth).
 * MAL Bank → UAE NRA · Global Account → US NRA 2022
 */
import type { CompliancePerimeter } from "../config/perimeters";
import type { RiskBand } from "../engine/rbm/types";
import {
  allBusinessActivities,
  lookupBusinessActivity,
  MASTER_REGISTRY_VERSION,
  nraSourceForPerimeter,
  registryMeta,
} from "./master/registryService";
import type { MasterBusinessActivity } from "./master/types";

export interface NraSectorEntry {
  id: string;
  label: string;
  nraRating: "Very High" | "High" | "Medium" | "Low";
  inherentScore: number;
  fatfSector: string;
  keywords: string[];
  isicCodes: string[];
  isicPrefixes: string[];
  eddRequired: boolean;
  reviewCycleMonths: number;
  mlTypologies: string[];
  monitoringRules: string[];
  rationale: string;
}

export interface NraRegistry {
  version: string;
  source: string;
  published: string;
  jurisdiction: string;
  perimeter: CompliancePerimeter;
  ratingScale: Record<string, number>;
  sectors: NraSectorEntry[];
}

export interface NraSectorMatch {
  sector: NraSectorEntry;
  matchType: "keyword" | "isic_code" | "isic_prefix" | "typology" | "default";
  matchDetail: string;
  registry: NraRegistry;
}

function ratingToNra(rating: string): NraSectorEntry["nraRating"] {
  if (rating === "Very High" || rating === "Prohibited") return "Very High";
  if (rating === "High") return "High";
  if (rating === "Medium") return "Medium";
  return "Low";
}

function activityToNraSector(entry: MasterBusinessActivity, perimeter: CompliancePerimeter): NraSectorEntry {
  const j = perimeter === "mal_bank" ? entry.uae : entry.us;
  return {
    id: entry.id,
    label: entry.activityName,
    nraRating: ratingToNra(j.rating),
    inherentScore: j.cramScore * 33,
    fatfSector: entry.riskRationale.slice(0, 80),
    keywords: entry.keywords,
    isicCodes: entry.isicCodes,
    isicPrefixes: [...new Set(entry.isicCodes.map((c) => (c.length <= 2 ? c : c.slice(0, 2))))],
    eddRequired: j.eddRequired,
    reviewCycleMonths: j.eddRequired ? 12 : 24,
    mlTypologies: [entry.riskRationale],
    monitoringRules: [],
    rationale: j.rationale,
  };
}

function mapMatchType(
  type: "isic" | "keyword" | "name" | "id" | "default",
): NraSectorMatch["matchType"] {
  if (type === "isic") return "isic_code";
  if (type === "id") return "keyword";
  if (type === "default") return "default";
  return "keyword";
}

/** Resolve best NRA sector match for activity label + ISIC under perimeter policy. */
export function resolveNraSector(
  perimeter: CompliancePerimeter,
  activityLabel: string,
  isicCode?: string,
): NraSectorMatch {
  const registry = nraRegistryForPerimeter(perimeter);
  const match = lookupBusinessActivity(activityLabel, perimeter, isicCode);

  if (match) {
    return {
      sector: activityToNraSector(match.entry, perimeter),
      matchType: mapMatchType(match.matchType),
      matchDetail: match.matchDetail,
      registry,
    };
  }

  const fallback = registry.sectors.find((s) => s.id === "ACT-SOFTWARE")
    ?? registry.sectors[registry.sectors.length - 1];

  return {
    sector: fallback,
    matchType: "default",
    matchDetail: "No NRA sector match — default sector applied",
    registry,
  };
}

export function nraRegistryForPerimeter(perimeter: CompliancePerimeter): NraRegistry {
  const meta = registryMeta();
  return {
    version: MASTER_REGISTRY_VERSION,
    source: nraSourceForPerimeter(perimeter),
    published: meta.effectiveDate,
    jurisdiction: perimeter === "mal_bank" ? "UAE" : "US",
    perimeter,
    ratingScale: { "Very High": 90, High: 80, Medium: 50, Low: 25 },
    sectors: allBusinessActivities().map((a) => activityToNraSector(a, perimeter)),
  };
}

export function nraRatingToRiskBand(rating: NraSectorEntry["nraRating"]): RiskBand {
  return nraRatingToBand(rating);
}

function nraRatingToBand(rating: NraSectorEntry["nraRating"]): RiskBand {
  switch (rating) {
    case "Very High": return "High";
    case "High": return "High";
    case "Medium": return "Medium";
    default: return "Low";
  }
}

export { nraRatingToBand };
