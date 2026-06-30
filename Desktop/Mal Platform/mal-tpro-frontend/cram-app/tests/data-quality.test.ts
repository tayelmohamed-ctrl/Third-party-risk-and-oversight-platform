import { describe, expect, it } from "vitest";
import {
  incompleteCaptureDemo, scoreWithDataQualityGate, validCaptureDemo, validKycDemo,
  validateDataQuality,
} from "../src/engine/dataQualityGate";

describe("KYC data-quality gate (FR-007 / GV-19)", () => {
  it("GV-19 — missing mandatory fields → BLOCKED, no score", () => {
    const gated = scoreWithDataQualityGate(incompleteCaptureDemo(), validKycDemo());
    expect(gated.ready).toBe(false);
    if (!gated.ready) {
      expect(gated.verdict.status).toBe("BLOCKED");
      expect(gated.verdict.missingFields.length).toBeGreaterThan(0);
      expect(gated.verdict.workflowState).toBe("DATA_PENDING");
    }
  });

  it("valid capture + KYC → READY and produces score", () => {
    const gated = scoreWithDataQualityGate(validCaptureDemo(), validKycDemo());
    expect(gated.ready).toBe(true);
    if (gated.ready) {
      expect(gated.result.composite).toBeGreaterThan(0);
      expect(gated.verdict.status).toBe("READY");
    }
  });

  it("unverified identity blocks scoring", () => {
    const kyc = { ...validKycDemo(), identityVerified: false };
    const v = validateDataQuality(validCaptureDemo(), kyc);
    expect(v.status).toBe("BLOCKED");
    expect(v.issues.some((i) => i.code === "IDENTITY_UNVERIFIED")).toBe(true);
  });

  it("stale KYC refresh blocks existing customers", () => {
    const kyc = { ...validKycDemo(), lastKycRefreshAt: "2018-01-01" };
    const v = validateDataQuality(validCaptureDemo(), kyc);
    expect(v.status).toBe("BLOCKED");
    expect(v.issues.some((i) => i.code === "KYC_OVERDUE")).toBe(true);
  });

  it("entity incorporation country drives geography (not stale birth country)", () => {
    const capture = {
      ...validCaptureDemo(),
      mode: "entity" as const,
      segment: "SME",
      legalForm: "legal" as const,
      uboStatus: "verified" as const,
      entityType: "Limited Liability Company (LLC)",
      opcoCountry: "United Arab Emirates",
      incorpCountry: "United Arab Emirates",
      uboCountry: "United Arab Emirates",
      birthCountry: "India",
      employment: "1",
      profession: "",
      investigations: "1",
      strs: "1",
    };
    const gated = scoreWithDataQualityGate(capture, validKycDemo());
    expect(gated.ready).toBe(true);
    if (gated.ready) {
      expect(gated.input.incorpFirm).toBeDefined();
      expect(gated.input.birthFirm).toBe(gated.input.incorpFirm);
    }
  });

  it("salaried individual does not require self-employed activity", () => {
    const capture = { ...validCaptureDemo(), employment: "1", activity: "" };
    const v = validateDataQuality(capture, validKycDemo());
    expect(v.status).toBe("READY");
    expect(v.missingFields).not.toContain("activity");
  });

  it("STR filed triggers OVR-010 floor", () => {
    const capture = { ...validCaptureDemo(), strs: "3", investigations: "3" };
    const gated = scoreWithDataQualityGate(capture, validKycDemo());
    expect(gated.ready).toBe(true);
    if (gated.ready) {
      expect(gated.result.overrides.some((o) => o.id === "OVR-010")).toBe(true);
      expect(gated.result.finalRating).toBe("High");
    }
  });
});
