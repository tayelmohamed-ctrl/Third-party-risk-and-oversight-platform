/** In-memory active config — synced from DB on bootstrap / config approval. */

export interface FactorWeightsConfig {
  customerType: number;
  geography: number;
  product: number;
  service: number;
  channel: number;
  transaction: number;
}

export const DEFAULT_FACTOR_WEIGHTS: FactorWeightsConfig = {
  customerType: 0.25,
  geography: 0.20,
  product: 0.15,
  service: 0.10,
  channel: 0.10,
  transaction: 0.20,
};

let activeFactorWeights: FactorWeightsConfig = { ...DEFAULT_FACTOR_WEIGHTS };

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
