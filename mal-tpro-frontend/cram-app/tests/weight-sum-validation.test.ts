/**
 * A-5 — Weight-sum validation.
 * UAE Methodology §3.3 & US Methodology §3.3: every weight set must sum to 1.0 ± 0.0001.
 * The module-load IIFE in runtimeConfig.ts throws if any set is out of tolerance — these tests
 * verify that constraint is met and that the fail-closed perimeter guard works.
 */
import { describe, expect, it } from "vitest";
import {
  UAE_LIFECYCLE_WEIGHTS,
  US_LIFECYCLE_WEIGHTS,
  getFactorWeightsForInput,
  type LifecycleWeightProfile,
} from "../src/config/runtimeConfig";
import { baseInput } from "../src/validation/fixtures";

const PROFILES: LifecycleWeightProfile[] = [
  "np_new", "np_existing",
  "lp_new", "lp_existing",
  "fi_new", "fi_existing",
];

function sumWeights(w: Record<string, number>): number {
  return Object.values(w).reduce((a, b) => a + b, 0);
}

describe("Weight-sum validation — §3.3 compliance (A-5)", () => {
  it.each(PROFILES)("UAE %s sums to 1.0 ± 0.0001", (profile) => {
    const sum = sumWeights(UAE_LIFECYCLE_WEIGHTS[profile]);
    expect(Math.abs(sum - 1.0)).toBeLessThanOrEqual(0.0001);
  });

  it.each(PROFILES)("US %s sums to 1.0 ± 0.0001", (profile) => {
    const sum = sumWeights(US_LIFECYCLE_WEIGHTS[profile]);
    expect(Math.abs(sum - 1.0)).toBeLessThanOrEqual(0.0001);
  });

  it("getFactorWeightsForInput returns UAE weights for mal_bank", () => {
    const input = baseInput({ masterRegistryPerimeter: "mal_bank", lifecycle: "New", customerMode: "individual" });
    const fw = getFactorWeightsForInput(input);
    // UAE NP-New Geo=20%, Channel=25%
    expect(fw.geography).toBeCloseTo(0.20, 4);
    expect(fw.channel).toBeCloseTo(0.25, 4);
  });

  it("getFactorWeightsForInput returns US weights for global_account (Geo/Channel swapped)", () => {
    const input = baseInput({ masterRegistryPerimeter: "global_account", lifecycle: "New", customerMode: "individual" });
    const fw = getFactorWeightsForInput(input);
    // US NP-New Geo=25%, Channel=20%
    expect(fw.geography).toBeCloseTo(0.25, 4);
    expect(fw.channel).toBeCloseTo(0.20, 4);
  });

  it("getFactorWeightsForInput throws on unknown perimeter", () => {
    const input = baseInput({ masterRegistryPerimeter: "unknown_perimeter" as any });
    expect(() => getFactorWeightsForInput(input)).toThrow("[CRAM §3.3]");
  });

  it("returned weight set sums to 1.0 for both perimeters", () => {
    const uae = getFactorWeightsForInput(baseInput({ masterRegistryPerimeter: "mal_bank" }));
    const us = getFactorWeightsForInput(baseInput({ masterRegistryPerimeter: "global_account" }));
    expect(Math.abs(sumWeights(uae) - 1.0)).toBeLessThanOrEqual(0.0001);
    expect(Math.abs(sumWeights(us) - 1.0)).toBeLessThanOrEqual(0.0001);
  });
});
