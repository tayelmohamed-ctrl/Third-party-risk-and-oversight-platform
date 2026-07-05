import { describe, expect, it } from "vitest";
import { resolveNraSector, nraRegistryForPerimeter } from "../src/registries/nraRegistry";
import { buildStructuredActivity, scoreStructuredActivity } from "../src/registries/rbmRegistries";
import { scoreFromActivityRegister } from "../src/engine/rbm/scoreRbm";
import { scoreCaptureWithRbm, legacyProductScoreFromRbm } from "../src/lib/cramRbmBridge";
import type { AssessmentCapture } from "../src/engine/dataQualityGate";

describe("UAE NRA (MAL Bank)", () => {
  it("maps precious metals dealers to High NRA sector", () => {
    const match = resolveNraSector("mal_bank", "Precious metals dealers", "4672");
    expect(match.sector.id).toBe("ACT-PREC-METALS");
    expect(match.sector.nraRating).toBe("High");
    expect(match.registry.jurisdiction).toBe("UAE");
  });

  it("scores precious metals activity ≥ 80 with EDD", () => {
    const act = buildStructuredActivity({
      label: "Precious metals dealers",
      isicCode: "4672",
      mode: "entity",
      perimeter: "mal_bank",
    });
    expect(act.nraRating).toBe("High");
    expect(act.eddRequired).toBe(true);
    expect(scoreStructuredActivity(act)).toBeGreaterThanOrEqual(80);
  });

  it("scores software low under UAE NRA", () => {
    const act = buildStructuredActivity({
      label: "Software development",
      isicCode: "6201",
      mode: "entity",
      perimeter: "mal_bank",
    });
    expect(act.nraRating).toBe("Low");
    expect(scoreStructuredActivity(act)).toBeLessThan(60);
  });
});

describe("US NRA (Global Account)", () => {
  it("maps precious metals dealers to US NRA High sector", () => {
    const match = resolveNraSector("global_account", "Precious metals dealers", "4672");
    expect(match.sector.id).toBe("ACT-PREC-METALS");
    expect(match.sector.nraRating).toBe("High");
    expect(match.registry.jurisdiction).toBe("US");
  });

  it("Rakez precious metal trading resolves via keyword", () => {
    const match = resolveNraSector("mal_bank", "Non-Manufactured Precious Metal Trading", "514204");
    expect(match.sector.nraRating).toBe("High");
    expect(match.matchType).toMatch(/keyword|isic/);
  });

  it("MSB typology is Very High under US NRA", () => {
    const match = resolveNraSector("global_account", "Money services businesses", "6619");
    expect(match.sector.nraRating).toBe("Very High");
  });
});

describe("CRAM bridge — product · use case · activity", () => {
  const baseCapture = (overrides: Partial<AssessmentCapture>): AssessmentCapture => ({
    customerId: "T1",
    customerName: "Test Co",
    segment: "SME",
    lifecycle: "New",
    mode: "entity",
    residenceCountry: "United Arab Emirates",
    nationalityCountry: "United Arab Emirates",
    birthCountry: "United Arab Emirates",
    sowCountry: "United Arab Emirates",
    sofCountry: "United Arab Emirates",
    opcoCountry: "United Arab Emirates",
    incorpCountry: "United Arab Emirates",
    uboCountry: "United Arab Emirates",
    activity: "Precious metals dealers",
    profession: "",
    providedIsicCode: "4672",
    product: "International Transfers / Remittances",
    pep: "None",
    expectedMonthlyBand: "2",
    actualMonthlyBand: "2",
    legalForm: "natural",
    uboStatus: "verified",
    uboLayers: "1",
    employment: "2",
    service: "2",
    initChannel: "2",
    deliveryChannel: "2",
    behaviour: "consistent",
    investigations: "1",
    strs: "1",
    sanctions: "Clear",
    watchlist: "Clear",
    adverse: "None",
    ...overrides,
  });

  it("Global Account + precious metals + trade finance use case scores High", () => {
    const result = scoreCaptureWithRbm(
      baseCapture({ product: "International Transfers / Remittances" }),
      "global_account",
      "US",
      "trade_finance",
    );
    expect(result.compositeBand).toMatch(/High|Medium High/);
    expect(result.eddRequired).toBe(true);
    expect(result.overrides.some((o) => o.id === "OVR-NRA")).toBe(true);
    expect(result.why.some((w) => w.includes("NRA"))).toBe(true);
  });

  it("MAL Bank + payroll + domestic scores lower than global precious metals", () => {
    const domestic = scoreCaptureWithRbm(
      baseCapture({
        activity: "Retail sale in non-specialized stores",
        providedIsicCode: "4711",
        product: "Basic Current/Savings Account",
      }),
      "mal_bank",
      "UAE",
      "payroll",
    );
    const highRisk = scoreCaptureWithRbm(
      baseCapture({ activity: "Precious metals dealers", providedIsicCode: "4672" }),
      "mal_bank",
      "UAE",
      "trade_finance",
    );
    expect(highRisk.compositeScore).toBeGreaterThan(domestic.compositeScore);
    expect(highRisk.components.find((c) => c.key === "businessActivity")!.rawScore)
      .toBeGreaterThan(domestic.components.find((c) => c.key === "businessActivity")!.rawScore);
  });

  it("product mapping scores international transfers higher than basic account", () => {
    const intl = legacyProductScoreFromRbm("International Transfers / Remittances", "global_account");
    const basic = legacyProductScoreFromRbm("Basic Current/Savings Account", "mal_bank");
    expect(intl).toBeGreaterThanOrEqual(basic);
  });

  it("use case marketplace increases use-case factor vs payroll", () => {
    const payroll = scoreFromActivityRegister({
      perimeter: "global_account",
      mode: "entity",
      activityLabel: "Software development",
      isicCode: "6201",
      useCaseId: "payroll",
      corridorId: "us_global",
    });
    const marketplace = scoreFromActivityRegister({
      perimeter: "global_account",
      mode: "entity",
      activityLabel: "Software development",
      isicCode: "6201",
      useCaseId: "marketplace_settlement",
      corridorId: "us_global",
    });
    const payrollUseCase = payroll.components.find((c) => c.key === "useCase")!.rawScore;
    const marketplaceUseCase = marketplace.components.find((c) => c.key === "useCase")!.rawScore;
    expect(marketplaceUseCase).toBeGreaterThan(payrollUseCase);
  });
});

describe("NRA registry completeness", () => {
  it("UAE registry has precious metals and MSB sectors", () => {
    const reg = nraRegistryForPerimeter("mal_bank");
    expect(reg.sectors.some((s) => s.id === "ACT-PREC-METALS")).toBe(true);
    expect(reg.sectors.some((s) => s.id === "ACT-MSB")).toBe(true);
  });

  it("US registry has precious metals and crypto sectors", () => {
    const reg = nraRegistryForPerimeter("global_account");
    expect(reg.sectors.some((s) => s.id === "ACT-PREC-METALS")).toBe(true);
    expect(reg.sectors.some((s) => s.id === "ACT-CRYPTO")).toBe(true);
  });
});
