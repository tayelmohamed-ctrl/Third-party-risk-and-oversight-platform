import { describe, expect, it } from "vitest";
import {
  LOCKED_OVR_IDS,
  validateConfigProposal,
  patchConfigWithMakerChecker,
} from "../server/config/configStore";
import { DEFAULT_FACTOR_WEIGHTS } from "../src/config/runtimeConfig";
import OVERRIDES from "../src/data/override_rules.json";

describe("Config maker-checker API (GV-26…28)", () => {
  it("GV-28 — rejects factor weights that do not sum to 1.0", () => {
    const bad = { ...DEFAULT_FACTOR_WEIGHTS, geography: 0.5 };
    const result = validateConfigProposal("factor_weights", bad);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("1.0");
  });

  it("GV-27 — rejects deactivating locked OVR-001", () => {
    const rules = (OVERRIDES as { id: string; trigger: string; outcome: string; priority: string }[]).map((r) => ({
      id: r.id,
      trigger: r.trigger,
      outcome: r.outcome,
      priority: r.priority,
      active: r.id !== "OVR-001",
      locked: LOCKED_OVR_IDS.includes(r.id),
    }));
    const result = validateConfigProposal("override_rules", rules);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("OVR-001");
  });

  it("GV-26 — rejects maker === checker on direct PATCH", async () => {
    const result = await patchConfigWithMakerChecker({
      table: "factor_weights",
      payload: { ...DEFAULT_FACTOR_WEIGHTS },
      makerUser: "maker@mal.ae",
      checkerUser: "maker@mal.ae",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(403);
      expect(result.error).toContain("different users");
    }
  });

  it("accepts valid factor weight proposal validation", () => {
    const result = validateConfigProposal("factor_weights", { ...DEFAULT_FACTOR_WEIGHTS });
    expect(result.ok).toBe(true);
  });
});

describe("Assessment provenance", () => {
  it("builds library version snapshot", async () => {
    const { buildLibraryVersionsSnapshot } = await import("../src/config/modelProvenance");
    const snap = buildLibraryVersionsSnapshot();
    expect(snap.modelVersionId).toContain("CRAM-CBUAE");
    expect(snap.countries.count).toBeGreaterThan(200);
    expect(snap.factorWeights).toBeDefined();
    expect(snap.bandBoundaries.calculator.mediumMax).toBe(2.15);
  });
});

describe("Vendor readiness G2", () => {
  it("passes in default dev environment", async () => {
    const { evaluateVendorReadiness } = await import("../src/validation/vendorReadiness");
    const report = evaluateVendorReadiness();
    expect(report.passed).toBe(true);
    expect(report.checks.length).toBeGreaterThanOrEqual(4);
  });
});
