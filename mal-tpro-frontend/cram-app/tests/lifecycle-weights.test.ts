import { describe, expect, it } from "vitest";
import { scoreCustomer } from "../src/engine/cram";
import { baseInput, ALL_LOW } from "../src/validation/fixtures";
import {
  getFactorWeightsForInput,
  LIFECYCLE_FACTOR_WEIGHTS,
  resolveLifecycleWeightProfile,
} from "../src/config/runtimeConfig";
import type { Score } from "../src/engine/types";

describe("Lifecycle factor weights (§6.1)", () => {
  it("resolves NP New vs NP Existing profiles", () => {
    const npNew = baseInput({ lifecycle: "New", customerMode: "individual", segment: "Retail" });
    const npExisting = baseInput({ lifecycle: "Existing", customerMode: "individual", segment: "Retail" });
    expect(resolveLifecycleWeightProfile(npNew)).toBe("np_new");
    expect(resolveLifecycleWeightProfile(npExisting)).toBe("np_existing");
    expect(getFactorWeightsForInput(npExisting).transaction).toBe(0.30);
    expect(getFactorWeightsForInput(npNew).transaction).toBe(0.10);
  });

  it("resolves LP/MER and FI profiles from segment", () => {
    const lpNew = baseInput({ lifecycle: "New", customerMode: "entity", segment: "SME" });
    const fiExisting = baseInput({ lifecycle: "Existing", customerMode: "entity", segment: "FI" });
    expect(resolveLifecycleWeightProfile(lpNew)).toBe("lp_new");
    expect(resolveLifecycleWeightProfile(fiExisting)).toBe("fi_existing");
  });

  it("NP Existing weights increase transaction factor contribution vs NP New", () => {
    const bump = { ...ALL_LOW, actualMonthlyBand: 3 as Score, expectedMonthlyBand: 2 as Score };
    const npNew = scoreCustomer(baseInput({ ...bump, lifecycle: "New" }), "calculator");
    const npExisting = scoreCustomer(baseInput({ ...bump, lifecycle: "Existing" }), "calculator");
    const txnNew = npNew.factors.find((f) => f.key === "transaction")!.contribution;
    const txnExisting = npExisting.factors.find((f) => f.key === "transaction")!.contribution;
    expect(txnExisting).toBeGreaterThan(txnNew);
  });

  it("all lifecycle profiles sum to 1.0", () => {
    for (const profile of Object.values(LIFECYCLE_FACTOR_WEIGHTS)) {
      const sum = Object.values(profile).reduce((a, b) => a + b, 0);
      expect(sum).toBeCloseTo(1, 5);
    }
  });
});
