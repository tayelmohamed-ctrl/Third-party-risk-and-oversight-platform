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

/** UAE Methodology §5.1 NP New — default onboarding profile */
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

/**
 * UAE Methodology §5.1 — authoritative factor weights per (segment class × lifecycle).
 * Product+service split 60/40 of combined P&S pillar.
 * FI profiles: "Systems and controls" factor (15%) is redistributed proportionally
 * until the FI capture UI is extended to collect S&C inputs.
 * TODO(compliance-confirm): wire FI S&C parameter library inputs (§6, P1-2) and remove redistribution.
 */
export const UAE_LIFECYCLE_WEIGHTS: Record<LifecycleWeightProfile, FactorWeightsConfig> = {
  // NP (Retail/Affluent/HNW) — UAE Methodology §5.1
  np_new:      { customerType: 0.25,   geography: 0.20,   product: 0.12,  service: 0.08,  channel: 0.25,  transaction: 0.10 },
  np_existing: { customerType: 0.20,   geography: 0.15,   product: 0.09,  service: 0.06,  channel: 0.20,  transaction: 0.30 },
  // LP/MER (SME/Corporate) — UAE Methodology §5.1
  lp_new:      { customerType: 0.25,   geography: 0.20,   product: 0.12,  service: 0.08,  channel: 0.20,  transaction: 0.15 },
  lp_existing: { customerType: 0.20,   geography: 0.15,   product: 0.09,  service: 0.06,  channel: 0.15,  transaction: 0.35 },
  // FI — UAE Methodology §5.1 — S&C 15% redistributed (÷0.85 normalisation)
  fi_new:      { customerType: 0.2353, geography: 0.2353, product: 0.1412, service: 0.0941, channel: 0.1176, transaction: 0.1765 },
  fi_existing: { customerType: 0.1765, geography: 0.2353, product: 0.1412, service: 0.0941, channel: 0.1176, transaction: 0.2353 },
};

/**
 * US Methodology §5.1 — authoritative factor weights per (segment class × lifecycle).
 * Geography and Channel differ from UAE (US: Geo 25%/Channel 20% vs UAE: Geo 20%/Channel 25% for NP-New).
 * FI profiles: S&C redistributed (÷0.80 for FI-New, ÷0.85 for FI-Existing) until P1-2 wired.
 * TODO(compliance-confirm): wire FI S&C parameter library inputs (§6.3, P1-2) and remove redistribution.
 */
export const US_LIFECYCLE_WEIGHTS: Record<LifecycleWeightProfile, FactorWeightsConfig> = {
  // NP (Retail/Affluent/HNW) — US Methodology §5.1
  np_new:      { customerType: 0.25,   geography: 0.25,   product: 0.12,  service: 0.08,  channel: 0.20,  transaction: 0.10 },
  np_existing: { customerType: 0.20,   geography: 0.20,   product: 0.09,  service: 0.06,  channel: 0.15,  transaction: 0.30 },
  // LP/MER (SME/Corporate) — US Methodology §5.1
  lp_new:      { customerType: 0.25,   geography: 0.20,   product: 0.12,  service: 0.08,  channel: 0.15,  transaction: 0.20 },
  lp_existing: { customerType: 0.20,   geography: 0.15,   product: 0.09,  service: 0.06,  channel: 0.10,  transaction: 0.40 },
  // FI — US Methodology §5.1 — FI-New S&C 20% redistributed (÷0.80), FI-Exist S&C 15% redistributed (÷0.85)
  fi_new:      { customerType: 0.1875, geography: 0.25,   product: 0.15,  service: 0.10,  channel: 0.125, transaction: 0.1875 },
  fi_existing: { customerType: 0.1765, geography: 0.2353, product: 0.1412, service: 0.0941, channel: 0.1176, transaction: 0.2353 },
};

/** Backward-compat alias — UAE weights are the default (historical behaviour preserved). */
export const LIFECYCLE_FACTOR_WEIGHTS = UAE_LIFECYCLE_WEIGHTS;

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

// A-5: Fail-closed weight-sum validation — runs at module load.
// UAE Methodology §3.3 & US Methodology §3.3: weight set must sum to 1.0 ± 0.0001.
// Any set outside tolerance throws, blocking the entire scoring module from initialising.
(function validateWeightSets() {
  const tables: [string, Record<LifecycleWeightProfile, FactorWeightsConfig>][] = [
    ["UAE", UAE_LIFECYCLE_WEIGHTS],
    ["US", US_LIFECYCLE_WEIGHTS],
  ];
  for (const [perimeter, weights] of tables) {
    for (const [profile, w] of Object.entries(weights)) {
      const sum = Object.values(w).reduce((a, b) => a + b, 0);
      if (Math.abs(sum - 1.0) > 0.0001) {
        throw new Error(
          `[CRAM §3.3] ${perimeter}/${profile} weight set sums to ${sum.toFixed(6)} — outside 1.0 ± 0.0001. Scoring blocked.`,
        );
      }
    }
  }
})();

export function getFactorWeightsForInput(input?: ScoreInput): FactorWeightsConfig {
  if (!input) return { ...activeFactorWeights };
  // A-5: fail-closed on explicitly invalid perimeter value; default undefined → mal_bank (backward compat)
  const perimeter = input.masterRegistryPerimeter;
  if (perimeter !== undefined && perimeter !== "mal_bank" && perimeter !== "global_account") {
    throw new Error(`[CRAM §3.3] Unknown perimeter "${perimeter}" — scoring blocked.`);
  }
  // P1-1: perimeter-specific weight tables — UAE Methodology §5.1 vs US Methodology §5.1
  const table = perimeter === "global_account" ? US_LIFECYCLE_WEIGHTS : UAE_LIFECYCLE_WEIGHTS;
  const profile = resolveLifecycleWeightProfile(input);
  return { ...table[profile] };
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
