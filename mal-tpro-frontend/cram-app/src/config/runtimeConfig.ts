/** In-memory active config — synced from DB on bootstrap / config approval. */
import type { ScoreInput } from "../engine/types";

export interface FactorWeightsConfig {
  customerType: number;
  geography: number;
  product: number;
  service: number;
  channel: number;
  transaction: number;
}

/** §6.1 NP New — default onboarding profile */
export const DEFAULT_FACTOR_WEIGHTS: FactorWeightsConfig = {
  customerType: 0.25,
  geography: 0.20,
  product: 0.12,
  service: 0.08,
  channel: 0.25,
  transaction: 0.10,
};

export type LifecycleWeightProfile =
  | "np_new"
  | "np_existing"
  | "lp_new"
  | "lp_existing"
  | "fi_new"
  | "fi_existing";

/** Authoritative §6.1 factor weights — product+service split 60/40 of combined pillar */
export const LIFECYCLE_FACTOR_WEIGHTS: Record<LifecycleWeightProfile, FactorWeightsConfig> = {
  np_new: { customerType: 0.25, geography: 0.20, product: 0.12, service: 0.08, channel: 0.25, transaction: 0.10 },
  np_existing: { customerType: 0.20, geography: 0.15, product: 0.09, service: 0.06, channel: 0.20, transaction: 0.30 },
  lp_new: { customerType: 0.25, geography: 0.20, product: 0.12, service: 0.08, channel: 0.20, transaction: 0.15 },
  lp_existing: { customerType: 0.20, geography: 0.15, product: 0.09, service: 0.06, channel: 0.15, transaction: 0.35 },
  // FI profiles — systems & controls (15%) redistributed proportionally across other factors
  fi_new: { customerType: 0.235, geography: 0.235, product: 0.141, service: 0.094, channel: 0.118, transaction: 0.177 },
  fi_existing: { customerType: 0.176, geography: 0.235, product: 0.141, service: 0.094, channel: 0.118, transaction: 0.236 },
};

let activeFactorWeights: FactorWeightsConfig = { ...DEFAULT_FACTOR_WEIGHTS };

export function resolveLifecycleWeightProfile(input: ScoreInput): LifecycleWeightProfile {
  const mode = input.customerMode ?? (input.legalForm === "natural" ? "individual" : "entity");
  const existing = input.lifecycle === "Existing";
  if (mode === "individual") {
    return existing ? "np_existing" : "np_new";
  }
  const seg = (input.segment ?? "").toUpperCase();
  if (seg === "FI") {
    return existing ? "fi_existing" : "fi_new";
  }
  return existing ? "lp_existing" : "lp_new";
}

export function getFactorWeightsForInput(input?: ScoreInput): FactorWeightsConfig {
  if (!input) return { ...activeFactorWeights };
  return { ...LIFECYCLE_FACTOR_WEIGHTS[resolveLifecycleWeightProfile(input)] };
}

export function getFactorWeights(): FactorWeightsConfig {
  return { ...activeFactorWeights };
}

export function setActiveFactorWeights(weights: FactorWeightsConfig): void {
  activeFactorWeights = { ...weights };
}

export function factorWeightSum(weights: FactorWeightsConfig = getFactorWeights()): number {
  return Object.values(weights).reduce((a, b) => a + b, 0);
}

export function validateFactorWeightSum(weights: FactorWeightsConfig): boolean {
  const sum = factorWeightSum(weights);
  return sum > 0.999 && sum < 1.001;
}

export function lifecycleWeightLabel(profile: LifecycleWeightProfile): string {
  const labels: Record<LifecycleWeightProfile, string> = {
    np_new: "NP · New",
    np_existing: "NP · Existing",
    lp_new: "LP/MER · New",
    lp_existing: "LP/MER · Existing",
    fi_new: "FI · New",
    fi_existing: "FI · Existing",
  };
  return labels[profile];
}
