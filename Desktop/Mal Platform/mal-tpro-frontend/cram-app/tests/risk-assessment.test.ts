import { describe, expect, it } from "vitest";
import { scoreCustomer } from "../src/engine/cram";
import { computeGoldenThread } from "../src/engine/goldenThread";
import { buildRiskAssessmentSummary } from "../src/engine/riskExplainability";
import {
  isProfessionCompatibleWithEmployment,
  professionTriggersEdd,
} from "../src/engine/professionRiskIntelligence";
import { baseInput, ALL_LOW } from "../src/validation/fixtures";
import { entityTypeScore } from "../src/config/entityLegalTypes";
import { CONTROL_LABELS, type ControlInputs } from "../src/engine/cramSuiteConfig";
import type { Score, ScoreInput } from "../src/engine/types";

const DEFAULT_CONTROLS: ControlInputs = { cdd: 2, sow: 2, mon: 2, scr: 2, edd: 1, ovs: 2 };

function individualLabels() {
  const o = {} as Record<string, string>;
  (Object.keys(CONTROL_LABELS) as (keyof typeof CONTROL_LABELS)[]).forEach((k) => {
    o[k] = CONTROL_LABELS[k].individual;
  });
  return o as Record<keyof typeof CONTROL_LABELS, string>;
}

function assess(partial: Partial<ScoreInput> = {}) {
  const input = baseInput({
    ...ALL_LOW,
    customerMode: "individual",
    employmentScore: 2 as Score,
    selfEmployed: true,
    declaredProfession: "",
    declaredActivity: "",
    ...partial,
  });
  const result = scoreCustomer(input, "calculator");
  const gt = computeGoldenThread("individual", input, result, DEFAULT_CONTROLS, individualLabels(), new Date("2026-06-01"));
  const summary = buildRiskAssessmentSummary("individual", input, result, gt);
  return { input, result, gt, summary };
}

describe("Risk assessment engine — EDD alignment", () => {
  it("high ISIC (casino) triggers EDD — not Standard CDD alone", () => {
    const { gt } = assess({
      declaredActivity: "Casinos",
      declaredProfession: "Casino Operator",
      natureOfBusinessScore: 3 as Score,
    });
    expect(gt.eddRequired).toBe(true);
    expect(gt.dueDiligence).toContain("EDD");
    expect(gt.dueDiligence).not.toBe("Standard CDD");
  });

  it("gatekeeper profession (lawyer) triggers EDD and MLRO approval", () => {
    const { gt } = assess({
      declaredProfession: "Lawyer",
      declaredActivity: "Legal, consulting and accounting activities",
      professionScore: 3 as Score,
    });
    expect(professionTriggersEdd("Lawyer")).toBe(true);
    expect(gt.eddRequired).toBe(true);
    expect(gt.approval.who).toMatch(/MLRO/i);
  });

  it("Foreign PEP requires MLRO approval even at low composite", () => {
    const { gt, result } = assess({ pep: "Foreign" });
    expect(result.finalRating).toBe("High");
    expect(gt.eddRequired).toBe(true);
    expect(gt.approval.who).toMatch(/MLRO/i);
  });

  it("adverse media true match triggers EDD pathway", () => {
    const { gt } = assess({ adverse: "True Match" });
    expect(gt.eddRequired).toBe(true);
    expect(gt.dueDiligence).toContain("EDD");
  });
});

describe("Risk explainability", () => {
  it("populates risk drivers for self-employed gambling profile", () => {
    const { summary } = assess({
      employmentScore: 2 as Score,
      declaredActivity: "Casinos",
      declaredProfession: "Freelancer",
    });
    expect(summary.drivers.length).toBeGreaterThan(3);
    expect(summary.drivers.some((d) => d.impact === "increase" || d.impact === "floor")).toBe(true);
    expect(summary.factorBreakdown.length).toBe(10);
    expect(summary.factorBreakdown.some((f) => f.key === "productService")).toBe(true);
    expect(summary.policyAlignment.some((l) => l.includes("EDD"))).toBe(true);
  });

  it("factor breakdown composite weights sum to 1.0", () => {
    const { summary } = assess();
    const wtSum = summary.factorBreakdown
      .filter((f) => f.contribution > 0)
      .reduce((a, f) => a + f.weight, 0);
    expect(wtSum).toBeCloseTo(1, 5);
  });
});

describe("Product & service worst-of pillar", () => {
  it("uses max(product, service) for composite — high service cannot be diluted by low product", () => {
    const lowSvc = baseInput({ ...ALL_LOW, productScore: 1 as Score, serviceScore: 1 as Score });
    const highSvc = baseInput({ ...ALL_LOW, productScore: 1 as Score, serviceScore: 3 as Score });
    const rLow = scoreCustomer(lowSvc, "calculator");
    const rHigh = scoreCustomer(highSvc, "calculator");
    expect(rHigh.productServicePillar?.combinedScore).toBe(3);
    expect(rHigh.productServicePillar?.drivenBy).toBe("service");
    expect(rHigh.productServicePillar?.contribution).toBe(0.75);
    expect(rHigh.composite).toBeGreaterThan(rLow.composite);
    expect(rHigh.composite - rLow.composite).toBeCloseTo(0.5, 2);
    // Separate scoring would contribute only 0.15 + 0.30 = 0.45 vs 0.75 worst-of
    expect(rHigh.productServicePillar!.contribution).toBeGreaterThan(
      1 * 0.15 + 3 * 0.10,
    );
  });

  it("shows separate audit contributions for product and service sub-scores", () => {
    const input = baseInput({ ...ALL_LOW, customerMode: "individual", productScore: 1 as Score, serviceScore: 3 as Score });
    const result = scoreCustomer(input, "calculator");
    const gt = computeGoldenThread("individual", input, result, DEFAULT_CONTROLS, individualLabels(), new Date("2026-06-01"));
    const summary = buildRiskAssessmentSummary("individual", input, result, gt);
    const prod = summary.factorBreakdown.find((f) => f.key === "product")!;
    const svc = summary.factorBreakdown.find((f) => f.key === "service")!;
    const pillar = summary.factorBreakdown.find((f) => f.key === "productService")!;
    expect(prod.contribution).toBe(0);
    expect(prod.auditContribution).toBeCloseTo(0.15, 3);
    expect(svc.auditContribution).toBeCloseTo(0.30, 3);
    expect(pillar.contribution).toBeCloseTo(0.75, 3);
  });
});

describe("Channel worst-of pillar", () => {
  it("uses max(initiation, delivery) — high delivery cannot be diluted by low initiation", () => {
    const lowDel = baseInput({ ...ALL_LOW, initiationChannelScore: 1 as Score, deliveryChannelScore: 1 as Score });
    const highDel = baseInput({ ...ALL_LOW, initiationChannelScore: 1 as Score, deliveryChannelScore: 3 as Score });
    const rLow = scoreCustomer(lowDel, "calculator");
    const rHigh = scoreCustomer(highDel, "calculator");
    expect(rHigh.channelPillar?.combinedScore).toBe(3);
    expect(rHigh.channelPillar?.drivenBy).toBe("delivery");
    expect(rHigh.channelPillar?.contribution).toBeCloseTo(0.3, 5);
    expect(rHigh.composite).toBeGreaterThan(rLow.composite);
    expect(rHigh.composite - rLow.composite).toBeCloseTo(0.2, 2);
    // HTML 50/50 average would contribute (1+3)/2 × 0.10 = 0.20 vs max 0.30
    expect(rHigh.channelPillar!.contribution).toBeGreaterThan(((1 + 3) / 2) * 0.10);
  });

  it("shows separate audit contributions for initiation and delivery sub-scores", () => {
    const input = baseInput({ ...ALL_LOW, initiationChannelScore: 1 as Score, deliveryChannelScore: 3 as Score });
    const result = scoreCustomer(input, "calculator");
    const gt = computeGoldenThread("individual", input, result, DEFAULT_CONTROLS, individualLabels(), new Date("2026-06-01"));
    const summary = buildRiskAssessmentSummary("individual", input, result, gt);
    const init = summary.factorBreakdown.find((f) => f.key === "channelInit")!;
    const del = summary.factorBreakdown.find((f) => f.key === "channelDelivery")!;
    const pillar = summary.factorBreakdown.find((f) => f.key === "channel")!;
    expect(init.contribution).toBe(0);
    expect(init.auditContribution).toBeCloseTo(0.05, 3);
    expect(del.auditContribution).toBeCloseTo(0.15, 3);
    expect(pillar.contribution).toBeCloseTo(0.30, 3);
  });
});

describe("PEP gate — excluded from composite", () => {
  it("Foreign PEP composite equals non-PEP — floor applied via OVR-008 only", () => {
    const base = baseInput({ ...ALL_LOW, customerMode: "individual" });
    const pep = baseInput({ ...ALL_LOW, customerMode: "individual", pep: "Foreign" });
    const rBase = scoreCustomer(base, "calculator");
    const rPep = scoreCustomer(pep, "calculator");
    expect(rPep.composite).toBeCloseTo(rBase.composite, 5);
    expect(rPep.pepGate?.overrideHigh).toBe(true);
    expect(rPep.finalRating).toBe("High");
    expect(rBase.finalRating).toBe("Low");
    expect(rPep.overrides.some((o) => o.id === "OVR-008")).toBe(true);
  });

  it("Domestic PEP applies Medium floor without composite uplift", () => {
    const r = scoreCustomer(baseInput({ ...ALL_LOW, pep: "Domestic" }), "calculator");
    expect(r.pepGate?.mediumFloor).toBe(true);
    expect(r.finalRating).toBe("Medium");
    const none = scoreCustomer(baseInput({ ...ALL_LOW }), "calculator");
    expect(r.composite).toBeCloseTo(none.composite, 5);
  });

  it("PEP audit row shows legacy share but zero composite contribution", () => {
    const r = scoreCustomer(baseInput({ ...ALL_LOW, pep: "Foreign" }), "calculator");
    const row = r.factors.find((f) => f.key === "pep")!;
    expect(row.contribution).toBe(0);
    expect(row.auditContribution).toBeGreaterThan(0);
  });
});

describe("Behaviour gate — expected vs actual", () => {
  it("override status triggers OVR-020 High floor — not diluted by low transaction uplift", () => {
    const input = baseInput({
      ...ALL_LOW,
      expectedMonthlyBand: 1 as Score,
      actualMonthlyBand: 3 as Score,
      behaviourStatus: "significantly_exceeds",
    });
    const result = scoreCustomer(input, "calculator");
    expect(result.behaviourGate?.overrideHigh).toBe(true);
    expect(result.overrides.some((o) => o.id === "OVR-020" && o.cls === "HIGH")).toBe(true);
    expect(result.finalRating).toBe("High");
  });

  it("flag status requires review without High floor override", () => {
    const input = baseInput({
      ...ALL_LOW,
      expectedMonthlyBand: 2 as Score,
      actualMonthlyBand: 3 as Score,
      behaviourStatus: "moderately_above",
    });
    const result = scoreCustomer(input, "calculator");
    expect(result.behaviourGate?.gateType).toBe("flag");
    expect(result.behaviourGate?.reviewRequired).toBe(true);
    expect(result.overrides.some((o) => o.id === "OVR-020")).toBe(false);
    expect(result.finalRating).not.toBe("High");
  });

  it("transaction factor uses light uplift — deviation bands alone do not triple-count", () => {
    const aligned = baseInput({ ...ALL_LOW, expectedMonthlyBand: 1 as Score, actualMonthlyBand: 1 as Score, behaviourStatus: "in_line" });
    const flagged = baseInput({ ...ALL_LOW, expectedMonthlyBand: 2 as Score, actualMonthlyBand: 3 as Score, behaviourStatus: "moderately_above" });
    const rAligned = scoreCustomer(aligned, "calculator");
    const rFlagged = scoreCustomer(flagged, "calculator");
    const txnAligned = rAligned.factors.find((f) => f.key === "transaction")!;
    const txnFlagged = rFlagged.factors.find((f) => f.key === "transaction")!;
    expect(txnFlagged.score - txnAligned.score).toBeLessThanOrEqual(2);
  });
});

describe("Entity legal type register", () => {
  it("Unregulated MSB is prohibited (OVR-006)", () => {
    const input = baseInput({
      ...ALL_LOW,
      customerMode: "entity",
      legalForm: "legal",
      uboStatus: "verified",
      declaredEntityType: "Unregulated Money Service Business (MSB)",
      entityTypeScore: 3,
      declaredActivity: "Grocery convenience store",
      natureOfBusinessScore: 1 as Score,
    });
    const result = scoreCustomer(input, "calculator");
    expect(result.finalRating).toBe("Prohibited");
    expect(result.overrides.some((o) => o.id === "OVR-006")).toBe(true);
  });

  it("LLC scores 2 (Medium) per LP/MER legal-form library", () => {
    expect(entityTypeScore("Limited Liability Company (LLC)")).toBe(2);
    const pjsc = baseInput({ ...ALL_LOW, customerMode: "entity", legalForm: "legal", uboStatus: "verified", declaredEntityType: "Public Joint Stock Company (PJSC)", entityTypeScore: 1 });
    const llc = baseInput({ ...ALL_LOW, customerMode: "entity", legalForm: "legal", uboStatus: "verified", declaredEntityType: "Limited Liability Company (LLC)", entityTypeScore: 2 });
    const spv = baseInput({ ...ALL_LOW, customerMode: "entity", legalForm: "legal", uboStatus: "verified", declaredEntityType: "Special Purpose Vehicle / Entity (SPV)", entityTypeScore: 3 });
    const rPjsc = scoreCustomer(pjsc, "calculator");
    const rLlc = scoreCustomer(llc, "calculator");
    const rSpv = scoreCustomer(spv, "calculator");
    expect(rLlc.composite).toBeGreaterThan(rPjsc.composite);
    expect(rSpv.composite).toBeGreaterThan(rLlc.composite);
  });

  it("NPO triggers High floor override", () => {
    const { result, gt } = assessEntity({ declaredEntityType: "Charity / Non-Profit Organisation (NPO)", entityTypeScore: 3 });
    expect(result.overrides.some((o) => o.id === "OVR-NPO")).toBe(true);
    expect(gt.eddRequired).toBe(true);
  });
});

function assessEntity(partial: Partial<ScoreInput> = {}) {
  const input = baseInput({
    ...ALL_LOW,
    customerMode: "entity",
    legalForm: "legal",
    uboStatus: "verified",
    declaredActivity: "Grocery convenience store",
    natureOfBusinessScore: 1 as Score,
    ...partial,
  });
  const result = scoreCustomer(input, "calculator");
  const gt = computeGoldenThread("entity", input, result, DEFAULT_CONTROLS, individualLabels(), new Date("2026-06-01"));
  const summary = buildRiskAssessmentSummary("entity", input, result, gt);
  return { input, result, gt, summary };
}

describe("Field dependencies — profession × employment", () => {
  it("filters salaried-incompatible professions when self-employed", () => {
    expect(isProfessionCompatibleWithEmployment("Software Engineer", 1)).toBe(true);
    expect(isProfessionCompatibleWithEmployment("Business Owner", 1)).toBe(false);
    expect(isProfessionCompatibleWithEmployment("Freelance Consultant", 2)).toBe(true);
  });
});
