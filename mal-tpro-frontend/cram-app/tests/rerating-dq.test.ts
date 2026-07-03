import { describe, expect, it } from "vitest";
import { scoreCustomer } from "../src/engine/cram";
import { lookupProfession } from "../src/engine/data";
import { validKycDemo } from "../src/engine/dataQualityGate";
import {
  applyTrigger, buildAssessment, reRate, type Assessment,
} from "../src/engine/rerating";
import { baseInput, ALL_LOW } from "../src/validation/fixtures";
import type { Score } from "../src/engine/types";

function seedAssessment(over: Partial<Assessment["input"]> = {}): Assessment {
  const input = baseInput({ ...ALL_LOW, ...over });
  const result = scoreCustomer(input, "calculator");
  return buildAssessment({
    customerId: "ACT-TEST",
    customerName: "Test Customer",
    input,
    result,
    trigger: "ONBOARDING",
    actor: "test",
    kycContext: validKycDemo(),
  });
}

describe("Re-rating DQ gate", () => {
  it("re-rates through snapshot gate when kycContext present", () => {
    const prev = seedAssessment();
    const outcome = reRate(prev, "ADVERSE_MEDIA", "News hit", "Mohsen");
    expect(outcome.ok).toBe(true);
    if (outcome.ok) {
      expect(outcome.assessment.rating).toBe("High");
      expect(outcome.assessment.input.adverse).toBe("True Match");
    }
  });

  it("blocks re-rating when screening fields removed from snapshot", () => {
    const prev = seedAssessment();
    prev.input = { ...prev.input, sanctions: undefined as unknown as "Clear" };
    const outcome = reRate(prev, "PERIODIC_REVIEW", "Review", "MLRO");
    expect(outcome.ok).toBe(false);
    if (!outcome.ok) {
      expect(outcome.verdict.status).toBe("BLOCKED");
    }
  });

  it("applyTrigger mutates adverse media consistently", () => {
    const input = baseInput(ALL_LOW);
    const next = applyTrigger(input, "ADVERSE_MEDIA");
    expect(next.adverse).toBe("True Match");
  });
});

describe("Unmapped profession floor", () => {
  it("never yields Low final rating for unmapped profession", () => {
    const input = baseInput({
      ...ALL_LOW,
      declaredProfession: "unknown xyz profession",
      professionScore: lookupProfession("unknown xyz profession") as Score,
    });
    const result = scoreCustomer(input, "calculator");
    expect(result.finalRating).toBe("Medium");
    expect(result.profileNotes.some((n) => n.includes("Unmapped"))).toBe(true);
  });
});
