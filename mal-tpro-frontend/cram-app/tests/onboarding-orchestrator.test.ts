import { describe, expect, it } from "vitest";
import {
  isShuftiAccepted, isShuftiDeclined, shuftiToKycContext, logIgnoredShuftiAml,
} from "../server/integrations/shuftipro/normalize";
import { isShuftiMockMode, buildShuftiReference, shuftiMockAcceptedPayload } from "../server/integrations/shuftipro/client";
import { SCREENING_AUTHORITY } from "../src/config/partnerIntegration";

describe("Phase 1b — Shufti Pro adapter", () => {
  it("detects mock mode when API key absent", () => {
    const prev = process.env.SHUFTIPRO_API_KEY;
    delete process.env.SHUFTIPRO_API_KEY;
    expect(isShuftiMockMode()).toBe(true);
    if (prev) process.env.SHUFTIPRO_API_KEY = prev;
  });

  it("builds vendor-scoped reference", () => {
    expect(buildShuftiReference("ACT001")).toMatch(/^SP-ACT001-/);
  });

  it("maps accepted webhook to KycQualityContext without screening timestamp", () => {
    const payload = shuftiMockAcceptedPayload("SP-ACT001-ref");
    expect(isShuftiAccepted(payload)).toBe(true);
    expect(isShuftiDeclined(payload)).toBe(false);
    const kyc = shuftiToKycContext(payload, new Date("2026-06-01T12:00:00Z"));
    expect(kyc.identityVerified).toBe(true);
    expect(kyc.livenessPass).toBe(true);
    expect(kyc.screeningCompletedAt).toBe("");
  });

  it("detects declined verification", () => {
    expect(isShuftiDeclined({ reference: "x", event: "verification.declined" })).toBe(true);
  });

  it("logs ignored AML fields when present", () => {
    expect(SCREENING_AUTHORITY.shuftiAmlIgnored).toBe(true);
    const msg = logIgnoredShuftiAml({
      reference: "SP-1",
      event: "verification.accepted",
      aml_sanctions: "clear",
    });
    expect(msg).toMatch(/Ignored Shufti AML/);
  });
});

describe("Phase 1b — onboarding state machine (types)", () => {
  const TERMINAL = ["SCORED", "BLOCKED", "CLEARED"] as const;
  const FLOW = [
    "INITIATED", "KYC_PENDING", "SCREENING_PENDING",
    "DISPOSITION_REQUIRED", "READY_TO_SCORE", ...TERMINAL,
  ];

  it("defines ordered lifecycle states", () => {
    expect(FLOW[0]).toBe("INITIATED");
    expect(FLOW).toContain("KYC_PENDING");
    expect(FLOW).toContain("SCREENING_PENDING");
    expect(TERMINAL).toContain("SCORED");
    expect(TERMINAL).toContain("BLOCKED");
  });
});
