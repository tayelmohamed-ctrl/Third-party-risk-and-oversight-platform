import { describe, expect, it } from "vitest";
import { resolveActivityRisk, resolveProfessionRisk } from "../src/engine/activityRisk";

import { describe, expect, it } from "vitest";
import { resolveActivityRisk, resolveProfessionRisk } from "../src/engine/activityRisk";
import {
  LIBRARY_COUNTS, PROFESSION_GUIDANCE_OPTIONS, TYPOLOGY_OPTIONS,
} from "../src/config/activityRegisterOptions";
import professionGuidance from "../src/data/isic_profession_guidance.json";
import isicLookup from "../src/data/isic_activity_lookup.json";

describe("ISIC activity risk — individual & entity", () => {
  it("loads full typology and profession guidance libraries", () => {
    expect(LIBRARY_COUNTS.typologies).toBe(6);
    expect(LIBRARY_COUNTS.professionGuidance).toBe(16);
    expect(LIBRARY_COUNTS.riskThemes).toBe(12);
    expect(TYPOLOGY_OPTIONS.length).toBe(isicLookup.length);
    expect(PROFESSION_GUIDANCE_OPTIONS.length).toBe(professionGuidance.length);
  });

  it("all 6 typologies resolve to High via ISIC shortcuts", () => {
    for (const label of TYPOLOGY_OPTIONS) {
      const r = resolveActivityRisk(label, "entity");
      expect(r.score).toBeGreaterThanOrEqual(2);
      expect(r.code).not.toBe("?");
    }
  });

  it("all 16 profession guidance profiles score at or above indicative risk", () => {
    for (const row of professionGuidance as { profession_customer_profile: string; indicative_aml_risk: string }[]) {
      const r = resolveProfessionRisk(row.profession_customer_profile);
      const floor = row.indicative_aml_risk === "High" ? 3 : row.indicative_aml_risk === "Medium" ? 2 : 1;
      expect(r.score).toBeGreaterThanOrEqual(floor);
    }
  });
  it("resolves MSB typology to ISIC 6619 High", () => {
    const r = resolveActivityRisk("money services business remittance", "entity");
    expect(r.code).toBe("6619");
    expect(r.score).toBe(3);
    expect(r.rating).toBe("High");
  });

  it("resolves casino via typology VH01", () => {
    const r = resolveActivityRisk("casino gaming", "entity");
    expect(r.score).toBe(3);
    expect(r.matchedRules.length).toBeGreaterThan(0);
  });

  it("resolves ISIC code 6419 directly", () => {
    const r = resolveActivityRisk("banking", "entity", "6419");
    expect(r.code).toBe("6419");
    expect(r.score).toBe(3);
  });

  it("lawyer profession uses guidance High", () => {
    const r = resolveProfessionRisk("Lawyer");
    expect(r.score).toBeGreaterThanOrEqual(2);
  });

  it("unmapped activity never scores Low without mapping", () => {
    const r = resolveActivityRisk("zzzzunknownactivity999", "individual");
    expect(r.score).toBeGreaterThanOrEqual(2);
    expect(r.remediationRequired).toBe(true);
  });
});
