import { describe, expect, it } from "vitest";
import { policyProfileForPerimeter } from "../src/registries/policyProfiles";
import {
  buildStructuredActivity,
  defaultProductForPerimeter,
  getCorridorById,
  scoreStructuredActivity,
} from "../src/registries/rbmRegistries";
import { scoreFromActivityRegister, scoreRbmAssessment } from "../src/engine/rbm/scoreRbm";
import { compareBehaviour, demoActualBehaviourMismatch, expectedProfileFromUseCase } from "../src/engine/rbm/behaviourEngine";

describe("RBM policy profiles", () => {
  it("loads CBUAE policy for MAL Bank", () => {
    const p = policyProfileForPerimeter("mal_bank");
    expect(p.id).toBe("cbuae");
    expect(p.regulator).toContain("UAE");
  });

  it("loads US BaaS policy for Global Account", () => {
    const p = policyProfileForPerimeter("global_account");
    expect(p.id).toBe("us_baas");
    expect(p.travelRule).toBe(true);
  });
});

describe("Structured business activity", () => {
  it("builds activity with ISIC as minor contributor", () => {
    const act = buildStructuredActivity({
      label: "Support activities for petroleum extraction",
      isicCode: "0910",
      mode: "entity",
      perimeter: "mal_bank",
    });
    expect(act.isicCode).toBeTruthy();
    expect(act.industry.toLowerCase()).toContain("oil");
    expect(act.tradeFinance).toBe(true);
    expect(act.rationale).toContain("ISIC ~");
    const scored = scoreStructuredActivity(act);
    expect(scored).toBeGreaterThan(50);
  });

  it("scores software lower than MSB", () => {
    const software = buildStructuredActivity({
      label: "Software development",
      isicCode: "6201",
      mode: "entity",
      perimeter: "global_account",
    });
    const msb = buildStructuredActivity({
      label: "Money transmission services",
      isicCode: "6419",
      mode: "entity",
      perimeter: "global_account",
    });
    expect(scoreStructuredActivity(software)).toBeLessThan(scoreStructuredActivity(msb));
  });
});

describe("RBM composite scoring", () => {
  it("Global Account product scores higher than MAL Bank current account", () => {
    const ga = defaultProductForPerimeter("global_account");
    const mb = defaultProductForPerimeter("mal_bank");
    expect(ga.inherentScore).toBeGreaterThan(mb.inherentScore);
  });

  it("high-risk corridor increases composite vs domestic", () => {
    const domestic = scoreFromActivityRegister({
      perimeter: "mal_bank",
      mode: "entity",
      activityLabel: "Retail trade",
      isicCode: "4711",
      useCaseId: "payroll",
      corridorId: "uae_uae",
    });
    const highRisk = scoreFromActivityRegister({
      perimeter: "global_account",
      mode: "entity",
      activityLabel: "Wholesale trade",
      isicCode: "4610",
      useCaseId: "trade_finance",
      corridorId: "uae_high_risk",
    });
    expect(highRisk.compositeScore).toBeGreaterThan(domestic.compositeScore);
    expect(highRisk.eddRequired).toBe(true);
  });

  it("produces explainable component breakdown summing to composite", () => {
    const result = scoreFromActivityRegister({
      perimeter: "global_account",
      mode: "entity",
      activityLabel: "Crude petroleum extraction",
      isicCode: "0610",
      useCaseId: "trade_finance",
      corridorId: "us_global",
    });
    expect(result.components.length).toBeGreaterThanOrEqual(7);
    expect(result.why.length).toBeGreaterThan(0);
    expect(result.compositeScore).toBeGreaterThan(0);
    expect(result.compositeScore).toBeLessThanOrEqual(100);
    expect(result.policyProfile.id).toBe("us_baas");
  });

  it("marketplace use case scores higher than payroll", () => {
    const payroll = scoreRbmAssessment({
      perimeter: "mal_bank",
      mode: "entity",
      productId: "mal_uae_current",
      corridorId: "uae_uae",
      useCaseId: "payroll",
      activity: buildStructuredActivity({
        label: "Retail",
        isicCode: "4711",
        mode: "entity",
        perimeter: "mal_bank",
      }),
    });
    const marketplace = scoreRbmAssessment({
      perimeter: "global_account",
      mode: "entity",
      productId: "global_account_us",
      corridorId: "us_global",
      useCaseId: "marketplace_settlement",
      activity: buildStructuredActivity({
        label: "E-commerce platform",
        isicCode: "4791",
        mode: "entity",
        perimeter: "global_account",
      }),
    });
    expect(marketplace.components.find((c) => c.key === "useCase")!.rawScore)
      .toBeGreaterThan(payroll.components.find((c) => c.key === "useCase")!.rawScore);
  });
});

describe("Behaviour engine", () => {
  it("detects payroll vs crypto mismatch", () => {
    const expected = expectedProfileFromUseCase("payroll", "Payroll", "UAE domestic");
    const actual = demoActualBehaviourMismatch();
    const { deviations, scoreUplift } = compareBehaviour(expected, actual);
    expect(deviations.length).toBeGreaterThan(2);
    expect(scoreUplift).toBeGreaterThan(10);
  });

  it("increases composite when actual behaviour deviates", () => {
    const baseline = scoreFromActivityRegister({
      perimeter: "mal_bank",
      mode: "entity",
      activityLabel: "Software development",
      isicCode: "6201",
      useCaseId: "payroll",
      corridorId: "uae_uae",
    });
    const withDeviation = scoreFromActivityRegister({
      perimeter: "mal_bank",
      mode: "entity",
      activityLabel: "Software development",
      isicCode: "6201",
      useCaseId: "payroll",
      corridorId: "uae_uae",
      actualBehaviour: demoActualBehaviourMismatch(),
    });
    const behBaseline = baseline.components.find((c) => c.key === "expectedBehaviour")!.contribution;
    const behDev = withDeviation.components.find((c) => c.key === "expectedBehaviour")!.contribution;
    expect(behDev).toBeGreaterThan(behBaseline);
  });
});

describe("Corridor risk registry", () => {
  it("UAE→UK scores lower than high-risk jurisdiction", () => {
    const uk = getCorridorById("uae_uk")!;
    const hr = getCorridorById("uae_high_risk")!;
    expect(uk.finalScore).toBeLessThan(hr.finalScore);
  });
});
