import { describe, expect, it } from "vitest";
import ruleLibrary from "../src/data/oscilar_rule_library.json";
import {
  PAKISTAN_RISK_TYPOLOGY_LIBRARY,
  tmCoveragePct,
  typologiesByCategory,
  allPakistanOscilarRuleIds,
} from "../src/config/pakistanRiskTypologyLibrary";
import { corridorThemeById, countryModuleByCode } from "../src/config/corridorEwraWorkflow";

describe("Pakistan risk typology library", () => {
  it("loads 14 Mal typology corpus entries from GA Workbook §8", () => {
    expect(PAKISTAN_RISK_TYPOLOGY_LIBRARY.malTypologyCorpus).toHaveLength(14);
    expect(PAKISTAN_RISK_TYPOLOGY_LIBRARY.malTypologyCorpus[0].id).toBe("TYP-PK-001");
    expect(PAKISTAN_RISK_TYPOLOGY_LIBRARY.malTypologyCorpus[0].name).toContain("Hawala");
  });

  it("includes NRA 2023 Very High predicate offences", () => {
    expect(PAKISTAN_RISK_TYPOLOGY_LIBRARY.nra2023.predicateOffencesVeryHigh).toContain("Illegal MVTS / hawala / hundi");
    expect(PAKISTAN_RISK_TYPOLOGY_LIBRARY.nra2023.predicateOffencesVeryHigh.length).toBeGreaterThanOrEqual(5);
  });

  it("includes compliance country module fields from Mal CCM Pakistan", () => {
    expect(PAKISTAN_RISK_TYPOLOGY_LIBRARY.complianceModule.documentId).toBe("Mal-CCM-Pakistan-v0.1");
    expect(PAKISTAN_RISK_TYPOLOGY_LIBRARY.complianceModule.supervisors.some((s) => s.code === "FMU")).toBe(true);
    expect(PAKISTAN_RISK_TYPOLOGY_LIBRARY.complianceModule.jurisdictionTypologies.length).toBeGreaterThanOrEqual(7);
  });

  it("rates UAE→PK corridor Critical L×I 25", () => {
    const aePk = PAKISTAN_RISK_TYPOLOGY_LIBRARY.corridorRatings.find((c) => c.corridorId === "COR-AE-PK");
    expect(aePk?.rating).toBe("Critical");
    expect(aePk?.likelihoodImpactScore).toBe(25);
  });

  it("filters typologies by category", () => {
    expect(typologiesByCategory("TF")).toHaveLength(1);
    expect(typologiesByCategory("ML").length).toBeGreaterThanOrEqual(10);
  });

  it("tracks TM rule coverage percentage", () => {
    expect(tmCoveragePct()).toBe(100);
  });

  it("maps every typology to valid Oscilar rule IDs", () => {
    const ruleIds = new Set(ruleLibrary.rules.map((r) => r.id));
    for (const t of PAKISTAN_RISK_TYPOLOGY_LIBRARY.malTypologyCorpus) {
      expect(t.oscilarRules.length).toBeGreaterThan(0);
      expect(t.primaryOscilarRule).toBeTruthy();
      for (const rid of t.oscilarRules) {
        expect(ruleIds.has(rid), `${t.id} → ${rid}`).toBe(true);
      }
    }
  });

  it("has dedicated Pakistan corridor rules OS-TM-031 through OS-TM-040", () => {
    for (let i = 31; i <= 40; i++) {
      const id = `OS-TM-${String(i).padStart(3, "0")}`;
      const rule = ruleLibrary.rules.find((r) => r.id === id);
      expect(rule, id).toBeTruthy();
      expect((rule as { pakistanTypologyId?: string }).pakistanTypologyId).toMatch(/^TYP-PK-/);
    }
  });
});

describe("Pakistan integration with corridor EWRA pack", () => {
  it("links PK country module to typology library", () => {
    const pk = countryModuleByCode("PK")!;
    expect(pk.typologyLibraryId).toBe("PK-TYPOLIB-2026-Q3");
    expect(pk.complianceModuleId).toBe("Mal-CCM-Pakistan-v0.1");
    expect(pk.fatfStatus).toBe("member");
  });

  it("advances COR-AE-PK to tm_live with typology IDs and Oscilar rules", () => {
    const cor = corridorThemeById("COR-AE-PK")!;
    expect(cor.workflowStage).toBe("tm_live");
    expect(cor.typologyLibraryId).toBe("PK-TYPOLIB-2026-Q3");
    expect(cor.corridorScore?.rating).toBe("Critical");
    expect(cor.corridorRisks.mlTypologies).toContain("TYP-PK-001");
    expect(cor.oscilarRules).toContain("OS-TM-031");
    expect(cor.oscilarRules.length).toBeGreaterThanOrEqual(20);
    expect(allPakistanOscilarRuleIds().length).toBeGreaterThanOrEqual(20);
  });
});
