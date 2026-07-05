// CRAM Suite config — aligned with MAL CBUAE-weighted model (Individual + Entity Appendix B)
import type { Band, FinalRating, Score } from "./types";

export type CustomerMode = "individual" | "entity";
export type ControlKey = "cdd" | "sow" | "mon" | "scr" | "edd" | "ovs";
export type ControlRating = 0 | 1 | 2 | 3;
export type ControlInputs = Record<ControlKey, ControlRating>;

export {
  ENTITY_TYPE_OPTIONS,
  ENTITY_LEGAL_TYPE_GROUPS,
  entityTypeToLegalForm,
  entityTypeScore,
  entityTypeProhibited,
  entityLegalTypeSummary,
  lookupEntityLegalType,
} from "../config/entityLegalTypes";

/** Segment options per customer mode (methodology Appendix B). */
export const SEGMENT_OPTIONS: Record<CustomerMode, readonly string[]> = {
  individual: ["Retail", "Affluent", "HNW"],
  entity: ["SME", "Corporate", "FI"],
};

export const SEGMENT_SCORES: Record<string, Score> = {
  Retail: 1, Affluent: 2, HNW: 3, SME: 2, Corporate: 2, FI: 3,
};

export function segmentScoreFor(segment: string): Score {
  return SEGMENT_SCORES[segment] ?? 2;
}

export const OWNERSHIP_LAYERS: Record<string, string> = {
  "Direct — 1 layer": "1",
  "2 layers": "2",
  "3+ layers (complex)": "3",
  "Nominee / opaque": "4",
};

export const CONTROL_LABELS: Record<ControlKey, { individual: string; entity: string }> = {
  cdd: { individual: "CDD & identity", entity: "CDD & UBO verification" },
  sow: { individual: "Source of funds", entity: "Source of funds" },
  mon: { individual: "Transaction monitoring", entity: "Transaction monitoring" },
  scr: { individual: "Screening cadence", entity: "Screening cadence" },
  edd: { individual: "EDD measures", entity: "EDD measures" },
  ovs: { individual: "Senior oversight", entity: "Senior oversight" },
};

export const CONTROL_OPTIONS = [
  { v: 0, label: "Not in place" },
  { v: 1, label: "Partial" },
  { v: 2, label: "Substantial" },
  { v: 3, label: "Strong" },
] as const;

export const CFG = {
  // UAE Methodology §13: Low max 36mo, Medium max 24mo, High max 12mo — used as fallback only;
  // golden thread uses policyProfiles reviewCycles for perimeter-specific values.
  reviewMonths: { Low: 36, Medium: 24, High: 12, Prohibited: 0 } as Record<FinalRating, number>,
  controlWeights: { cdd: 20, sow: 15, mon: 20, scr: 15, edd: 15, ovs: 15 },
  residual: { maxReduction: 40, oneBandCap: 1, gapThreshold: 66, appetite: "Medium" as Band },
  // UAE Methodology §3.1 & US Methodology §3.1 — threshold table (identical in both docs):
  // Low ≤1.5000 · Medium >1.5000 and ≤2.1500 · High >2.1500
  bands: { mediumFloor: 1.5, highFloor: 2.15 },
  expectedAed: {
    1: { single: 50_000, monthly: 50_000 },
    2: { single: 250_000, monthly: 250_000 },
    3: { single: 500_000, monthly: 500_000 },
  },
  expectedUsd: {
    1: { single: 15_000, monthly: 15_000 },
    2: { single: 75_000, monthly: 75_000 },
    3: { single: 150_000, monthly: 150_000 },
  },
};

export function dueDiligenceLevel(rating: FinalRating, pepAny: boolean): string {
  if (rating === "Prohibited") return "Exit / decline";
  if (rating === "High" || pepAny) return "Enhanced (EDD)";
  if (rating === "Medium") return "Standard CDD";
  return "Simplified CDD (where lawful)";
}

/** Policy-aligned CDD/EDD label — considers EDD triggers beyond composite band alone. */
export function resolveDueDiligenceLevel(
  rating: FinalRating,
  eddRequired: boolean,
  pepAny: boolean,
): string {
  if (rating === "Prohibited") return "Exit / decline";
  if (eddRequired) return "Enhanced (EDD)";
  if (rating === "Medium" || pepAny) return "Standard CDD + targeted";
  return "Simplified CDD (where lawful)";
}
