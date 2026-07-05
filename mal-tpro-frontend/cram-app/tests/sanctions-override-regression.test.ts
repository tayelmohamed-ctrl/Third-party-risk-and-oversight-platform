/**
 * A-8 — Sanctions override regression tests.
 *
 * OVR-011: geoFirmMax ∈ (2.15, 4) → Score 3 (High) but not Prohibited → HIGH override fires.
 * OVR-002: geoFirmMax ≥ 4 OR Category-A sanctioned-country name in residenceName/sofName → PROHIBITED fires.
 *
 * geoFirmMax = Math.max(residenceFirm, nationalityFirm, birthFirm, sowFirm, sofFirm, incorpFirm ?? 0).
 * These tests guard against accidental removal of the override conditions and confirm the
 * Score-3-vs-Prohibited boundary is enforced correctly.
 */
import { describe, expect, it } from "vitest";
import { scoreCustomer } from "../src/engine/cram";
import { baseInput } from "../src/validation/fixtures";

describe("Sanctions override regression — A-8", () => {
  it("OVR-011: residenceFirm=2.5 (Score 3, geoFirmMax<4) fires HIGH override", () => {
    const input = baseInput({ residenceFirm: 2.5 });
    const result = scoreCustomer(input);
    const ovr = result.overrides.find((o) => o.id === "OVR-011");
    expect(ovr).toBeDefined();
    expect(ovr?.cls).toBe("HIGH");
    expect(result.finalRating).toBe("High");
  });

  it("OVR-011: residenceFirm=4.0 does NOT fire OVR-011 (geoFirmMax ≥ 4 routes to OVR-002)", () => {
    const input = baseInput({ residenceFirm: 4.0 });
    const result = scoreCustomer(input);
    expect(result.overrides.find((o) => o.id === "OVR-011")).toBeUndefined();
    expect(result.finalRating).toBe("Prohibited");
  });

  it("OVR-002: geoFirmMax ≥ 4 (residenceFirm=4.0) fires PROHIBITED", () => {
    const input = baseInput({ residenceFirm: 4.0 });
    const result = scoreCustomer(input);
    const ovr = result.overrides.find((o) => o.id === "OVR-002");
    expect(ovr).toBeDefined();
    expect(ovr?.cls).toBe("PROHIBITED");
    expect(result.finalRating).toBe("Prohibited");
  });

  it("OVR-002: Category-A country name 'Iran' in residenceName fires PROHIBITED regardless of firm score", () => {
    const input = baseInput({ residenceName: "Iran" });
    const result = scoreCustomer(input);
    const ovr = result.overrides.find((o) => o.id === "OVR-002");
    expect(ovr).toBeDefined();
    expect(ovr?.cls).toBe("PROHIBITED");
    expect(result.finalRating).toBe("Prohibited");
  });

  it("OVR-002: Category-A country name 'North Korea' in sofName fires PROHIBITED", () => {
    const input = baseInput({ sofName: "North Korea" });
    const result = scoreCustomer(input);
    const ovr = result.overrides.find((o) => o.id === "OVR-002");
    expect(ovr).toBeDefined();
    expect(ovr?.cls).toBe("PROHIBITED");
    expect(result.finalRating).toBe("Prohibited");
  });
});
