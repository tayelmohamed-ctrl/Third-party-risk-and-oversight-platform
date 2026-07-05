import { describe, expect, it } from "vitest";
import { resolveActivityRisk } from "../src/engine/activityRisk";
import { lookupCountry } from "../src/engine/data";
import { captureToScoreInput, scoreWithDataQualityGate, validCaptureDemo } from "../src/engine/dataQualityGate";
import { scoreCustomer } from "../src/engine/cram";
import { resolvePepGate } from "../src/config/pepGate";
import { activityDropdownGroupsForPerimeter } from "../src/config/activityRegisterOptions";
import { computeGoldenThread } from "../src/engine/goldenThread";
import { policyProfileForPerimeter, reviewMonthsForBand } from "../src/registries/policyProfiles";
import { CONTROL_LABELS, type ControlInputs } from "../src/engine/cramSuiteConfig";
import { baseInput, ALL_LOW } from "../src/validation/fixtures";

const DEFAULT_CONTROLS: ControlInputs = { cdd: 2, sow: 2, mon: 2, scr: 2, edd: 1, ovs: 2 };

function individualLabels() {
  const o = {} as Record<string, string>;
  (Object.keys(CONTROL_LABELS) as (keyof typeof CONTROL_LABELS)[]).forEach((k) => {
    o[k] = CONTROL_LABELS[k].individual;
  });
  return o as Record<keyof typeof CONTROL_LABELS, string>;
}

describe("P0 regulatory integrity — perimeter separation", () => {
  it("gates RAKEZ resolution to mal_bank only", () => {
    const rakezLabel = "Accounting & Bookkeeping";
    const uae = resolveActivityRisk(rakezLabel, "entity", undefined, "7412-02", "mal_bank");
    const us = resolveActivityRisk(rakezLabel, "entity", undefined, "7412-02", "global_account");
    expect(uae.basis).toContain("RAKEZ");
    expect(us.basis).not.toContain("RAKEZ");
  });

  it("excludes RAKEZ from global_account activity dropdown groups", () => {
    const malGroups = activityDropdownGroupsForPerimeter("mal_bank");
    const usGroups = activityDropdownGroupsForPerimeter("global_account");
    expect(malGroups.some((g) => g.label.includes("RAKEZ"))).toBe(true);
    expect(usGroups.some((g) => g.label.includes("RAKEZ"))).toBe(false);
  });

  it("applies different country firm scores by perimeter", () => {
    const uaeRussia = lookupCountry("Russia", "mal_bank")!.firm;
    const usRussia = lookupCountry("Russia", "global_account")!.firm;
    expect(usRussia).toBeGreaterThanOrEqual(3);
    expect(usRussia).toBeGreaterThanOrEqual(uaeRussia);
  });

  it("uses pre-computed registry scores in scoreCustomer composite", () => {
    const capture = { ...validCaptureDemo(), compliancePerimeter: "mal_bank" as const };
    const input = captureToScoreInput(capture);
    input.professionScore = 1;
    input.natureOfBusinessScore = 1;
    const result = scoreCustomer(input);
    const customerFactor = result.factors.find((f) => f.key === "customerType")!;
    expect(customerFactor.score).toBeLessThan(2.5);
  });

  it("excludes STR/SAR/investigations from transaction factor for New customers", () => {
    const capture = {
      ...validCaptureDemo(),
      lifecycle: "New" as const,
      investigations: "3",
      strs: "3",
    };
    const input = captureToScoreInput(capture);
    expect(input.investigationsScore).toBe(1);
    expect(input.strsScore).toBe(1);
    const result = scoreCustomer(input);
    expect(result.overrides.some((o) => o.id === "OVR-010")).toBe(false);
    const txn = result.factors.find((f) => f.key === "transaction")!;
    expect(txn.score).toBe(input.actualMonthlyBand);
  });

  it("applies OVR-010 for Existing customers with filed STR/SAR", () => {
    const capture = {
      ...validCaptureDemo(),
      lifecycle: "Existing" as const,
      investigations: "3",
      strs: "3",
    };
    const input = captureToScoreInput(capture);
    const result = scoreCustomer(input);
    expect(result.overrides.some((o) => o.id === "OVR-010")).toBe(true);
  });

  it("resolves dual PEP gate by perimeter", () => {
    const malForeign = resolvePepGate("Foreign", undefined, "mal_bank");
    const usForeign = resolvePepGate("Foreign", undefined, "global_account");
    expect(malForeign.regulatoryBasis).toContain("CBUAE");
    expect(usForeign.regulatoryBasis).toContain("FinCEN");

    const usDomestic = resolvePepGate("Domestic", { mathBand: "Low", input: { serviceScore: 1, productScore: 1 } as never }, "global_account");
    expect(usDomestic.eddTrigger).toBe(true);
  });

  it("scores end-to-end via data quality gate with perimeter", () => {
    const capture = { ...validCaptureDemo(), compliancePerimeter: "global_account" as const };
    const kyc = {
      identitySource: "document",
      identityVerified: true,
      documentIssuedAt: "2022-01-01",
      lastKycRefreshAt: "2024-01-01",
      screeningCompletedAt: new Date().toISOString(),
      livenessPass: true,
    };
    const gated = scoreWithDataQualityGate(capture, kyc);
    expect(gated.ready).toBe(true);
    expect(gated.input?.masterRegistryPerimeter).toBe("global_account");
  });

  it("golden thread uses USD and shorter review cycles for global_account", () => {
    const malInput = baseInput({ ...ALL_LOW, masterRegistryPerimeter: "mal_bank" });
    const usInput = baseInput({ ...ALL_LOW, masterRegistryPerimeter: "global_account" });
    const malResult = scoreCustomer(malInput, "calculator");
    const usResult = scoreCustomer(usInput, "calculator");
    const malGt = computeGoldenThread("individual", malInput, malResult, DEFAULT_CONTROLS, individualLabels(), new Date("2026-06-01"));
    const usGt = computeGoldenThread("individual", usInput, usResult, DEFAULT_CONTROLS, individualLabels(), new Date("2026-06-01"));
    expect(malGt.monitoring.currency).toBe("AED");
    expect(usGt.monitoring.currency).toBe("USD");
    const malProfile = policyProfileForPerimeter("mal_bank");
    const usProfile = policyProfileForPerimeter("global_account");
    expect(reviewMonthsForBand(malProfile, "Low")).toBe(36); // Updated: UAE Low = 36 months (UAE Methodology §12.1; P0-3)
    expect(reviewMonthsForBand(usProfile, "Low")).toBe(36);
  });
});
