import { describe, expect, it } from "vitest";
import {
  GA_CORRIDOR_GUIDANCE,
  GA_CORRIDOR_ONWARD_TRAPS,
  GA_SELF_C2C_FLOWS,
  GA_PERIODIC_REVIEW_LENS,
  GA_SELF_C2C_SCENARIOS,
  GA_C2B_SCENARIOS,
  GA_B2C_SCENARIOS,
  GA_B2B_SCENARIOS,
  GA_M2M_SCENARIOS,
} from "../src/config/transactionPurposeCatalog";
import { FIVE_GATE_SPINE, ALERT_TRIAGE_SLA, OSCILAR_RULE_CATEGORIES } from "../src/config/oscilarProgramme";
import ruleLibrary from "../src/data/oscilar_rule_library.json";

/** Locks the Self-Transfer & C2C Scenario Pack alignment (Global Account, guidance + monitoring only). */
describe("GA Self-Transfer & C2C scenario-pack alignment", () => {
  it("covers all 9 permitted corridors with a rating + EDD level", () => {
    const codes = GA_CORRIDOR_GUIDANCE.map((c) => c.code).sort();
    expect(codes).toEqual(["AE", "BD", "EG", "ID", "JO", "PH", "PK", "SA", "TR"]);
    const allowed = ["Low", "Medium", "Medium-High", "High", "Critical", "Prohibited"];
    for (const c of GA_CORRIDOR_GUIDANCE) {
      expect(allowed).toContain(c.rating);
      expect(c.edd).toBeTruthy();
      expect(c.dominantTypologies.length).toBeGreaterThan(0);
    }
  });

  it("PK/EG run High and the onward traps include UAE→PK Critical + Iran block", () => {
    expect(GA_CORRIDOR_GUIDANCE.find((c) => c.code === "PK")?.rating).toBe("High");
    expect(GA_CORRIDOR_GUIDANCE.find((c) => c.code === "EG")?.rating).toBe("High");
    expect(GA_CORRIDOR_ONWARD_TRAPS.some((t) => /Pakistan/.test(t.route) && t.rating === "Critical")).toBe(true);
    expect(GA_CORRIDOR_ONWARD_TRAPS.some((t) => /Iran/.test(t.route) && t.rating === "Prohibited")).toBe(true);
  });

  it("surfaces the self/C2C flow catalog and the periodic-review lens", () => {
    expect(GA_SELF_C2C_FLOWS.some((f) => /C2C-12|M2M-01/.test(f.code) && /Confirmation of Payee/i.test(f.hardControl))).toBe(true);
    expect(GA_PERIODIC_REVIEW_LENS.length).toBeGreaterThanOrEqual(10);
  });

  it("adds the self-transfer / C2C TM rules OS-TM-041..046 with valid category & severity", () => {
    const rules = (ruleLibrary as { rules: { id: string; category: string; severity: string }[] }).rules;
    for (const id of ["OS-TM-041", "OS-TM-042", "OS-TM-043", "OS-TM-044", "OS-TM-045", "OS-TM-046"]) {
      const r = rules.find((x) => x.id === id);
      expect(r, `${id} present`).toBeTruthy();
      expect(OSCILAR_RULE_CATEGORIES).toContain(r!.category as (typeof OSCILAR_RULE_CATEGORIES)[number]);
      expect(["critical", "high", "medium", "low"]).toContain(r!.severity);
    }
    expect(rules.length).toBe(70);
  });

  it("adds the Mal2Mal (on-us) TM rules OS-TM-065..070 with valid category & severity", () => {
    const rules = (ruleLibrary as { rules: { id: string; category: string; severity: string }[] }).rules;
    for (const id of ["OS-TM-065", "OS-TM-066", "OS-TM-067", "OS-TM-068", "OS-TM-069", "OS-TM-070"]) {
      const r = rules.find((x) => x.id === id);
      expect(r, `${id} present`).toBeTruthy();
      expect(OSCILAR_RULE_CATEGORIES).toContain(r!.category as (typeof OSCILAR_RULE_CATEGORIES)[number]);
      expect(["critical", "high", "medium", "low"]).toContain(r!.severity);
    }
  });

  it("carries all 14 Mal-to-Mal (on-us) scenarios (M2M-GA-01…14) with a valid rating band", () => {
    const scenarios = GA_M2M_SCENARIOS.flatMap((j) => j.scenarios);
    expect(scenarios.length).toBe(14);
    const ids = scenarios.map((s) => s.id).sort();
    expect(ids[0]).toBe("M2M-GA-01");
    expect(new Set(ids).size).toBe(14);
    const bands = ["Low", "Medium", "Medium-High", "High", "Critical", "Prohibited"];
    for (const s of scenarios) {
      expect(bands).toContain(s.ratingBand);
      expect(s.title && s.profile && s.flow && s.outcome).toBeTruthy();
    }
    // the freeze/block cases are represented (sanctioned node, internal-layering chain)
    expect(scenarios.some((s) => s.id === "M2M-GA-04" && s.ratingBand === "Prohibited")).toBe(true);
    expect(scenarios.some((s) => s.id === "M2M-GA-13" && s.ratingBand === "Prohibited")).toBe(true);
  });

  it("adds the B2B TM rules OS-TM-059..064 with valid category & severity", () => {
    const rules = (ruleLibrary as { rules: { id: string; category: string; severity: string }[] }).rules;
    for (const id of ["OS-TM-059", "OS-TM-060", "OS-TM-061", "OS-TM-062", "OS-TM-063", "OS-TM-064"]) {
      const r = rules.find((x) => x.id === id);
      expect(r, `${id} present`).toBeTruthy();
      expect(OSCILAR_RULE_CATEGORIES).toContain(r!.category as (typeof OSCILAR_RULE_CATEGORIES)[number]);
      expect(["critical", "high", "medium", "low"]).toContain(r!.severity);
    }
  });

  it("carries all 20 Business→Business (B2B) scenarios (B2B-GA-01…20) with a valid rating band", () => {
    const scenarios = GA_B2B_SCENARIOS.flatMap((j) => j.scenarios);
    expect(scenarios.length).toBe(20);
    const ids = scenarios.map((s) => s.id).sort();
    expect(ids[0]).toBe("B2B-GA-01");
    expect(new Set(ids).size).toBe(20);
    const bands = ["Low", "Medium", "Medium-High", "High", "Critical", "Prohibited"];
    for (const s of scenarios) {
      expect(bands).toContain(s.ratingBand);
      expect(s.title && s.profile && s.flow && s.outcome).toBeTruthy();
    }
    // the refuse/prohibited cases are represented (unresolvable UBO, prohibited payer type, sanctioned counterparty)
    expect(scenarios.some((s) => s.id === "B2B-GA-03" && s.ratingBand === "Prohibited")).toBe(true);
    expect(scenarios.some((s) => s.id === "B2B-GA-18" && s.ratingBand === "Prohibited")).toBe(true);
  });

  it("adds the C2B TM rules OS-TM-047..052 with valid category & severity", () => {
    const rules = (ruleLibrary as { rules: { id: string; category: string; severity: string }[] }).rules;
    for (const id of ["OS-TM-047", "OS-TM-048", "OS-TM-049", "OS-TM-050", "OS-TM-051", "OS-TM-052"]) {
      const r = rules.find((x) => x.id === id);
      expect(r, `${id} present`).toBeTruthy();
      expect(OSCILAR_RULE_CATEGORIES).toContain(r!.category as (typeof OSCILAR_RULE_CATEGORIES)[number]);
      expect(["critical", "high", "medium", "low"]).toContain(r!.severity);
    }
  });

  it("adds the B2C TM rules OS-TM-053..058 with valid category & severity", () => {
    const rules = (ruleLibrary as { rules: { id: string; category: string; severity: string }[] }).rules;
    for (const id of ["OS-TM-053", "OS-TM-054", "OS-TM-055", "OS-TM-056", "OS-TM-057", "OS-TM-058"]) {
      const r = rules.find((x) => x.id === id);
      expect(r, `${id} present`).toBeTruthy();
      expect(OSCILAR_RULE_CATEGORIES).toContain(r!.category as (typeof OSCILAR_RULE_CATEGORIES)[number]);
      expect(["critical", "high", "medium", "low"]).toContain(r!.severity);
    }
  });

  it("carries all 20 Business→Individual (B2C) scenarios (B2C-GA-01…20) with a valid rating band", () => {
    const scenarios = GA_B2C_SCENARIOS.flatMap((j) => j.scenarios);
    expect(scenarios.length).toBe(20);
    const ids = scenarios.map((s) => s.id).sort();
    expect(ids[0]).toBe("B2C-GA-01");
    expect(new Set(ids).size).toBe(20);
    const bands = ["Low", "Medium", "Medium-High", "High", "Critical", "Prohibited"];
    for (const s of scenarios) {
      expect(bands).toContain(s.ratingBand);
      expect(s.title && s.profile && s.flow && s.outcome).toBeTruthy();
    }
    // the prohibited/refuse cases are represented (unresolvable UBO, prohibited type, unlicensed lender, sanctioned payee)
    expect(scenarios.some((s) => s.id === "B2C-GA-03" && s.ratingBand === "Prohibited")).toBe(true);
    expect(scenarios.some((s) => s.id === "B2C-GA-19" && s.ratingBand === "Prohibited")).toBe(true);
  });

  it("carries all 24 Individual→Business (C2B) scenarios (C2B-GA-01…24) with a valid rating band", () => {
    const scenarios = GA_C2B_SCENARIOS.flatMap((j) => j.scenarios);
    expect(scenarios.length).toBe(24);
    const ids = scenarios.map((s) => s.id).sort();
    expect(ids[0]).toBe("C2B-GA-01");
    expect(new Set(ids).size).toBe(24);
    const bands = ["Low", "Medium", "Medium-High", "High", "Critical", "Prohibited"];
    for (const s of scenarios) {
      expect(bands).toContain(s.ratingBand);
      expect(s.title && s.profile && s.flow && s.outcome).toBeTruthy();
    }
    // the block cases are represented (Iran-linked business, free-zone shell onward-Iran)
    expect(scenarios.some((s) => s.id === "C2B-GA-05" && s.ratingBand === "Prohibited")).toBe(true);
    expect(scenarios.some((s) => s.id === "C2B-GA-23" && s.ratingBand === "Prohibited")).toBe(true);
  });

  it("carries all 25 self-transfer/C2C scenarios (GA-01…GA-25) with a valid rating band", () => {
    const scenarios = GA_SELF_C2C_SCENARIOS.flatMap((j) => j.scenarios);
    expect(scenarios.length).toBe(25);
    const ids = scenarios.map((s) => s.id).sort();
    expect(ids[0]).toBe("GA-01");
    expect(new Set(ids).size).toBe(25); // unique
    const bands = ["Low", "Medium", "Medium-High", "High", "Critical", "Prohibited"];
    for (const s of scenarios) {
      expect(bands).toContain(s.ratingBand);
      expect(s.title && s.profile && s.geography && s.outcome).toBeTruthy();
    }
    // the two hard blocks and the funnel/mule overrides are represented
    expect(scenarios.some((s) => s.id === "GA-05" && s.ratingBand === "Prohibited")).toBe(true);
    expect(scenarios.some((s) => s.id === "GA-24" && s.ratingBand === "Prohibited")).toBe(true);
  });

  it("has the 5-gate decision spine (G0..G4) and P1/P2/P3 triage SLAs", () => {
    expect(FIVE_GATE_SPINE.map((g) => g.id)).toEqual(["G0", "G1", "G2", "G3", "G4"]);
    expect(ALERT_TRIAGE_SLA.map((t) => t.priority)).toEqual(["P1", "P2", "P3"]);
  });
});
