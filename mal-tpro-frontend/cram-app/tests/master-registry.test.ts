import { describe, expect, it } from "vitest";
import {
  lookupBusinessActivity,
  lookupProductById,
  cramProductScore,
  cramActivityScore,
  MASTER_REGISTRY_VERSION,
  registryMeta,
  allProducts,
} from "../src/registries/master/registryService";
import { captureToScoreInput } from "../src/engine/dataQualityGate";
import { legacyProductScoreFromRbm } from "../src/lib/cramRbmBridge";
import { getProductById } from "../src/registries/rbmRegistries";
import type { AssessmentCapture } from "../src/engine/dataQualityGate";

const preciousMetalsCapture = (perimeter: "mal_bank" | "global_account"): AssessmentCapture => ({
  customerId: "ACT-PREC-01",
  customerName: "Precious Metals Co",
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
  product: "Basic Current/Savings Account",
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
  compliancePerimeter: perimeter,
});

describe("Master Risk Registry — validation scenarios", () => {
  it("Scenario 1: MAL Bank + Precious Metals → UAE NRA High, EDD, cramScore 3", () => {
    const match = lookupBusinessActivity("Precious metals dealers", "mal_bank", "4672");
    expect(match).not.toBeNull();
    expect(match!.entry.id).toBe("ACT-PREC-METALS");
    expect(match!.jurisdiction.rating).toBe("High");
    expect(match!.jurisdiction.eddRequired).toBe(true);
    expect(match!.jurisdiction.cramScore).toBe(3);
    expect(match!.jurisdiction.rationale).toMatch(/UAE NRA/i);

    const input = captureToScoreInput(preciousMetalsCapture("mal_bank"));
    expect(input.natureOfBusinessScore).toBe(3);
    expect(input.masterRegistryActivityId).toBe("ACT-PREC-METALS");
    expect(input.masterRegistryPerimeter).toBe("mal_bank");
  });

  it("Scenario 2: Global Account + same activity → US-approved rating", () => {
    const match = lookupBusinessActivity("Precious metals dealers", "global_account", "4672");
    expect(match).not.toBeNull();
    expect(match!.jurisdiction.rating).toBe("High");
    expect(match!.jurisdiction.eddRequired).toBe(true);
    expect(match!.jurisdiction.rationale).toMatch(/US NRA/i);

    const input = captureToScoreInput(preciousMetalsCapture("global_account"));
    expect(input.natureOfBusinessScore).toBe(3);
    expect(input.masterRegistryPerimeter).toBe("global_account");
  });

  it("Scenario 3: product risk from single registry drives CRAM and RBM consistently", () => {
    const productName = "International Transfers / Remittances";
    const malBank = lookupProductById("PRD-INTL-TRANSFER", "mal_bank")!;
    const globalAccount = lookupProductById("PRD-INTL-TRANSFER", "global_account")!;

    expect(cramProductScore(productName, "mal_bank", 1)).toBe(malBank.jurisdiction.cramScore);
    expect(cramProductScore(productName, "global_account", 1)).toBe(globalAccount.jurisdiction.cramScore);
    expect(legacyProductScoreFromRbm(productName, "mal_bank")).toBe(malBank.jurisdiction.cramScore);
    expect(legacyProductScoreFromRbm(productName, "global_account")).toBe(globalAccount.jurisdiction.cramScore);
    expect(getProductById("PRD-INTL-TRANSFER", "mal_bank")!.inherentScore).toBe(malBank.jurisdiction.cramScore * 33);
  });
});

describe("Master Risk Registry — audit metadata", () => {
  it("exposes version and approval metadata on all registry entries", () => {
    const meta = registryMeta();
    expect(meta.version).toBe(MASTER_REGISTRY_VERSION);
    expect(meta.approvalStatus).toBe("approved");
    expect(meta.sourceDocument).toBeTruthy();

    for (const product of allProducts()) {
      expect(product.version).toBeTruthy();
      expect(product.effectiveDate).toBeTruthy();
      expect(product.approvalStatus).toBe("approved");
    }
  });

  it("cramActivityScore floors legacy score with master registry NRA rating", () => {
    const legacy = 1 as const;
    const elevated = cramActivityScore("Precious metals dealers", "mal_bank", "4672", legacy);
    expect(elevated).toBe(3);
  });
});
