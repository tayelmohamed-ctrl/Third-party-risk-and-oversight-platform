import { describe, expect, it } from "vitest";
import { scoreCustomer } from "../src/engine/cram";
import { lookupCountry, firmToScore, COUNTRIES } from "../src/engine/data";
import { sanctionsFloorForCountry } from "../src/config/sanctionsCountryRegistry";
import { baseInput, ALL_LOW } from "../src/validation/fixtures";

describe("Geography risk — UN / US OFAC / UAE TFS sanctions floors", () => {
  it("Cuba is High (not Medium) via sanctions floor", () => {
    const cuba = lookupCountry("Cuba");
    expect(cuba).toBeDefined();
    expect(cuba!.firm).toBeGreaterThan(2.15);
    expect(cuba!.band).toBe("High");
    expect(firmToScore(cuba!.firm)).toBe(3);
    expect(sanctionsFloorForCountry("Cuba")?.sources).toContain("US_OFAC");
  });

  it("Russia is High via sanctions floor", () => {
    const russia = lookupCountry("Russia");
    expect(russia).toBeDefined();
    expect(russia!.firm).toBeGreaterThanOrEqual(3);
    expect(russia!.band).toBe("High");
    expect(firmToScore(russia!.firm)).toBe(3);
  });

  it("Category A countries remain Prohibited nexus", () => {
    for (const name of ["Iran", "North Korea", "Syria"]) {
      const c = lookupCountry(name);
      expect(c!.firm).toBeGreaterThanOrEqual(4);
      expect(c!.band).toBe("Prohibited");
    }
  });

  it("Cuba residence drives High geography in composite scoring", () => {
    const cubaFirm = lookupCountry("Cuba")!.firm;
    const input = baseInput({
      ...ALL_LOW,
      residenceName: "Cuba",
      residenceFirm: cubaFirm,
      nationalityFirm: 1.35,
      birthFirm: 1.35,
      sowFirm: 1.35,
      sofFirm: 1.35,
    });
    const result = scoreCustomer(input);
    expect(result.factors.find((f) => f.key === "geography")?.score).toBe(3);
    expect(result.overrides.some((o) => o.id === "OVR-011")).toBe(true);
  });

  it("Russia residence triggers OVR-011 high-risk country override path", () => {
    const input = baseInput({
      ...ALL_LOW,
      residenceName: "Russia",
      residenceFirm: lookupCountry("Russia")!.firm,
      nationalityFirm: 1.35,
      birthFirm: 1.35,
      sowFirm: 1.35,
      sofFirm: 1.35,
    });
    const result = scoreCustomer(input);
    expect(result.factors.find((f) => f.key === "geography")?.score).toBe(3);
    expect(result.overrides.some((o) => o.id === "OVR-011")).toBe(true);
  });

  it("enriches all sanctioned programme countries at load", () => {
    const sanctioned = COUNTRIES.filter((c) => sanctionsFloorForCountry(c.country));
    expect(sanctioned.length).toBeGreaterThanOrEqual(20);
    for (const c of sanctioned) {
      const floor = sanctionsFloorForCountry(c.country)!;
      expect(c.firm).toBeGreaterThanOrEqual(floor.firmFloor);
    }
  });
});
