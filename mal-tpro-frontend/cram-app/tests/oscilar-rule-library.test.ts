import { describe, expect, it } from "vitest";
import ruleLibrary from "../src/data/oscilar_rule_library.json";
import {
  TXN_SCREENING_PROGRAMME, TXN_SCREENING_WORKFLOW, OSCILAR_RULE_CATEGORIES,
} from "../src/config/oscilarProgramme";
import { SCREENING_AUTHORITY } from "../src/config/partnerIntegration";

describe("Oscilar TM rule library", () => {
  it("loads rules from redline-aligned library", () => {
    expect(ruleLibrary.rules.length).toBe(40);
    expect(ruleLibrary.version).toBeTruthy();
  });

  it("covers transfer and card channels for MAL app users", () => {
    const channels = new Set(ruleLibrary.rules.map((r) => r.channel));
    expect(channels.has("transfer") || channels.has("both")).toBe(true);
    expect(channels.has("card") || channels.has("both")).toBe(true);
  });

  it("maps every rule to a known category", () => {
    for (const r of ruleLibrary.rules) {
      expect(OSCILAR_RULE_CATEGORIES).toContain(r.category);
      expect(r.id).toMatch(/^OS-TM-/);
      expect(r.severity).toMatch(/critical|high|medium|low/);
    }
  });

  it("includes sanctions mirror rule with Vital4 authority", () => {
    const sanc = ruleLibrary.rules.find((r) => r.id === "OS-TM-010");
    expect(sanc).toBeTruthy();
    expect(SCREENING_AUTHORITY.oscilarTxnScreeningMirror).toBe("vital4");
  });

  it("defines investigator programme and workflow sections", () => {
    expect(TXN_SCREENING_PROGRAMME.length).toBeGreaterThanOrEqual(3);
    expect(TXN_SCREENING_WORKFLOW.length).toBeGreaterThanOrEqual(6);
  });
});
