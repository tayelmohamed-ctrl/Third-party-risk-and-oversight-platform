import { describe, expect, it } from "vitest";
import {
  scoreAssessment,
  scoreSection,
  sectionsForPartnerCategory,
  requiresTmAssessment,
  TM_NO_GO_CONDITIONS,
} from "../src/config/tmPreImplementationAssessment";
import {
  TM_ALERT_BUSINESS_RULES,
  TM_GO_LIVE_GATES,
  TM_INVESTIGATION_RULES,
  TM_SCREENING_BUSINESS_RULES,
} from "../src/config/tmImplementationBrd";

describe("TM pre-implementation assessment", () => {
  it("loads questionnaire sections", () => {
    expect(sectionsForPartnerCategory("System integrator").length).toBeGreaterThan(30);
    expect(sectionsForPartnerCategory("KYC & identity").length).toBeGreaterThan(5);
  });

  it("scores Yes/Partial/No correctly", () => {
    const sec = sectionsForPartnerCategory("Risk platform")[0];
    const qs = sec.questions.slice(0, 4).map((q, i) => ({
      ...q,
      response: (["Yes", "Partial", "No", "Yes"] as const)[i],
    }));
    const score = scoreSection(qs);
    expect(score).toBeCloseTo(0.625, 2);
  });

  it("requires assessment for integrator categories", () => {
    expect(requiresTmAssessment("System integrator")).toBe(true);
    expect(requiresTmAssessment("Risk platform")).toBe(true);
  });

  it("computes overall readiness", () => {
    const first = sectionsForPartnerCategory("System integrator")[0];
    const responses: Record<string, "Yes" | "Partial" | "No"> = {};
    first.questions.forEach((q) => { responses[q.id] = "Yes"; });
    const result = scoreAssessment(responses);
    expect(result.overall).toBeGreaterThan(0);
    expect(result.decision).toBeTruthy();
  });

  it("includes no-go conditions from questionnaire", () => {
    expect(TM_NO_GO_CONDITIONS.length).toBeGreaterThanOrEqual(18);
    expect(TM_NO_GO_CONDITIONS[0].id).toMatch(/^NO-GO-/);
  });
});

describe("TM implementation BRD rules (Mohsen)", () => {
  it("defines seven go-live gates", () => {
    expect(TM_GO_LIVE_GATES).toHaveLength(7);
  });

  it("includes alert, screening, and investigation business rules", () => {
    expect(TM_ALERT_BUSINESS_RULES.length).toBeGreaterThanOrEqual(6);
    expect(TM_SCREENING_BUSINESS_RULES.length).toBeGreaterThanOrEqual(6);
    expect(TM_INVESTIGATION_RULES.length).toBeGreaterThanOrEqual(8);
  });

  it("links investigation rules to Mohsen pipeline", () => {
    const withStep = TM_INVESTIGATION_RULES.filter((r) => r.mohsenStep != null);
    expect(withStep.length).toBeGreaterThanOrEqual(3);
  });
});
