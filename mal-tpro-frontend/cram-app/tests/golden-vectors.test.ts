import { describe, expect, it } from "vitest";
import { GOLDEN_VECTORS, runAllGoldenVectors, runGoldenVector } from "../src/validation/goldenVectors";
import { runBacktest, analyzeOutcomes } from "../src/validation/backtest";
import { runIndependentValidation, evaluateGates } from "../src/validation/independentValidation";

describe("Golden vectors GV-01…39", () => {
  it("executes all vectors with zero failures", () => {
    const { summary, results } = runAllGoldenVectors();
    expect(summary.failed).toBe(0);
    expect(summary.passRate).toBeGreaterThanOrEqual(0.85);
    for (const r of results.filter((x) => !x.skipped)) {
      expect(r.passed, `${r.id}: ${r.detail}`).toBe(true);
    }
  });

  it("covers all 39 documented cases", () => {
    expect(GOLDEN_VECTORS).toHaveLength(44);
  });

  it("reproducibility cases GV-29 and GV-39", () => {
    for (const id of ["GV-29", "GV-39"]) {
      const c = GOLDEN_VECTORS.find((v) => v.id === id)!;
      const r = runGoldenVector(c);
      expect(r.passed).toBe(true);
    }
  });
});

describe("Back-test & outcome analysis", () => {
  it("demonstrates directional sensitivity — High band SAR rate exceeds Low", () => {
    const outcome = analyzeOutcomes();
    expect(outcome.monotonicSar).toBe(true);
    expect(outcome.monotonicAdverse).toBe(true);
    expect(outcome.liftSarHighVsLow).toBeGreaterThanOrEqual(2);
    expect(outcome.passesDirectionalSensitivity).toBe(true);
  });

  it("produces full back-test report", () => {
    const report = runBacktest();
    expect(report.outcome.cohortSize).toBeGreaterThan(100);
    expect(report.stabilityScore).toBeGreaterThan(0);
  });
});

describe("Independent validation gates G0–G6", () => {
  it("passes all gates for production approval", () => {
    const report = runIndependentValidation();
    expect(report.verdict).toBe("APPROVED");
    expect(report.gates.every((g) => g.passed)).toBe(true);
  });

  it("Gate 5 confirms score predicts SARs", () => {
    const backtest = runBacktest();
    const gates = evaluateGates(runAllGoldenVectors().summary, backtest);
    const g5 = gates.find((g) => g.id === "G5")!;
    expect(g5.passed).toBe(true);
  });
});
