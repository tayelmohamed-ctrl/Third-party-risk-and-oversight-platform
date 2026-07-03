import { describe, expect, it } from "vitest";
import {
  CORRIDOR_EWRA_PACK,
  countryModuleByCode,
  effectiveCountryScore,
  workflowStageIndex,
} from "../src/config/corridorEwraWorkflow";

describe("Corridor EWRA workflow pack", () => {
  it("loads version and Sayed ownership", () => {
    expect(CORRIDOR_EWRA_PACK.version).toMatch(/^CORRIDOR-EWRA-/);
    expect(CORRIDOR_EWRA_PACK.ownerAgent).toBe("sayed");
    expect(CORRIDOR_EWRA_PACK.section).toContain("Regulatory");
  });

  it("defines ordered workflow stages ending in review_due", () => {
    const ids = CORRIDOR_EWRA_PACK.workflowStages.map((s) => s.id);
    expect(ids[0]).toBe("identified");
    expect(ids[ids.length - 1]).toBe("review_due");
    expect(workflowStageIndex("live")).toBeLessThan(workflowStageIndex("review_due"));
  });

  it("links every corridor destination to a country module", () => {
    for (const c of CORRIDOR_EWRA_PACK.corridorThemes) {
      const dest = countryModuleByCode(c.destinationCountryCode);
      expect(dest, `missing module for ${c.destinationCountryCode}`).toBeDefined();
      const origin = countryModuleByCode(c.originCountryCode);
      expect(origin, `missing module for ${c.originCountryCode}`).toBeDefined();
    }
  });

  it("applies EWRA override when set", () => {
    const pk = countryModuleByCode("PK")!;
    const eff = effectiveCountryScore(pk);
    expect(eff.source).toBe("ewra_override");
    expect(eff.band).toBe("High");
    expect(eff.score).toBeGreaterThan(pk.craFirmScore);
  });

  it("seeds six UAE outbound remittance corridors", () => {
    expect(CORRIDOR_EWRA_PACK.corridorThemes.length).toBe(6);
    expect(CORRIDOR_EWRA_PACK.corridorThemes.every((c) => c.originCountryCode === "AE")).toBe(true);
  });

  it("assigns Mohsen as typology feed on corridors", () => {
    expect(CORRIDOR_EWRA_PACK.corridorThemes.every((c) => c.typologyFeed === "mohsen")).toBe(true);
  });

  it("uses MI-EWRA-001 for board reporting", () => {
    expect(CORRIDOR_EWRA_PACK.corridorThemes.every((c) => c.reportingTemplate === "MI-EWRA-001")).toBe(true);
  });
});
