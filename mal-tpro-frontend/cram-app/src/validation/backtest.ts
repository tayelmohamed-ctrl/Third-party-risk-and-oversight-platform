import type { BacktestRecord } from "./backtestCohort";
import { BACKTEST_COHORT } from "./backtestCohort";

export interface BandOutcomeStats {
  band: string;
  count: number;
  share: number;
  sarRate: number;
  tmAlertRate: number;
  investigationRate: number;
  adverseRate: number;
}

export interface OutcomeAnalysis {
  cohortSize: number;
  periodMonths: number;
  byBand: BandOutcomeStats[];
  liftSarHighVsLow: number;
  liftAdverseHighVsLow: number;
  sarCaptureInHigh: number;
  monotonicSar: boolean;
  monotonicAdverse: boolean;
  passesDirectionalSensitivity: boolean;
  summary: string;
}

function rate(records: BacktestRecord[], pred: (r: BacktestRecord) => boolean): number {
  return records.length ? records.filter(pred).length / records.length : 0;
}

export function analyzeOutcomes(cohort: BacktestRecord[] = BACKTEST_COHORT, periodMonths = 18): OutcomeAnalysis {
  const bands = ["Low", "Medium", "High"] as const;
  const byBand: BandOutcomeStats[] = bands.map((band) => {
    const subset = cohort.filter((r) => r.rating === band);
    return {
      band,
      count: subset.length,
      share: subset.length / cohort.length,
      sarRate: rate(subset, (r) => r.sarFiled),
      tmAlertRate: rate(subset, (r) => r.tmAlert),
      investigationRate: rate(subset, (r) => r.investigation),
      adverseRate: rate(subset, (r) => r.adverseOutcome),
    };
  });

  const low = byBand.find((b) => b.band === "Low")!;
  const high = byBand.find((b) => b.band === "High")!;
  const liftSar = low.sarRate > 0 ? high.sarRate / low.sarRate : high.sarRate > 0 ? Infinity : 1;
  const liftAdv = low.adverseRate > 0 ? high.adverseRate / low.adverseRate : high.adverseRate > 0 ? Infinity : 1;

  const totalSar = cohort.filter((r) => r.sarFiled).length;
  const sarInHigh = cohort.filter((r) => r.rating === "High" && r.sarFiled).length;
  const sarCaptureInHigh = totalSar ? sarInHigh / totalSar : 0;

  const monotonicSar = low.sarRate <= byBand[1].sarRate && byBand[1].sarRate <= high.sarRate;
  const monotonicAdverse = low.adverseRate <= byBand[1].adverseRate && byBand[1].adverseRate <= high.adverseRate;
  const passes = monotonicSar && monotonicAdverse && liftSar >= 2.0;

  return {
    cohortSize: cohort.length,
    periodMonths,
    byBand,
    liftSarHighVsLow: +liftSar.toFixed(2),
    liftAdverseHighVsLow: +liftAdv.toFixed(2),
    sarCaptureInHigh: +sarCaptureInHigh.toFixed(3),
    monotonicSar,
    monotonicAdverse,
    passesDirectionalSensitivity: passes,
    summary: passes
      ? `High band SAR rate ${(high.sarRate * 100).toFixed(1)}% vs Low ${(low.sarRate * 100).toFixed(1)}% (lift ${liftSar.toFixed(1)}×) — directional sensitivity confirmed.`
      : "Directional sensitivity not demonstrated — review thresholds before production.",
  };
}

export interface TuningResult {
  boundary: "calculator" | "cram";
  thresholds: { lowMax: number; mediumMax: number };
  distribution: { Low: number; Medium: number; High: number };
  highShare: number;
}

export function thresholdSensitivity(cohort: BacktestRecord[], boundary: "calculator" | "cram"): TuningResult {
  const lowMax = boundary === "calculator" ? 1.5 : 1.0;
  const mediumMax = boundary === "calculator" ? 2.15 : 2.0;
  const dist = { Low: 0, Medium: 0, High: 0 };
  for (const r of cohort) {
    if (r.composite <= lowMax) dist.Low++;
    else if (r.composite <= mediumMax) dist.Medium++;
    else dist.High++;
  }
  const n = cohort.length || 1;
  return {
    boundary,
    thresholds: { lowMax, mediumMax },
    distribution: dist,
    highShare: dist.High / n,
  };
}

export interface BacktestReport {
  outcome: OutcomeAnalysis;
  tuningCalculator: TuningResult;
  tuningCram: TuningResult;
  falseNegativeProxy: number;
  stabilityScore: number;
}

/** Full back-test pack for Gate 5 / quarterly model validation. */
export function runBacktest(cohort: BacktestRecord[] = BACKTEST_COHORT): BacktestReport {
  const outcome = analyzeOutcomes(cohort);
  const tuningCalculator = thresholdSensitivity(cohort, "calculator");
  const tuningCram = thresholdSensitivity(cohort, "cram");

  // Low-rated customers with SAR = false-negative proxy
  const lowSar = cohort.filter((r) => r.rating === "Low" && r.sarFiled).length;
  const falseNegativeProxy = cohort.filter((r) => r.rating === "Low").length
    ? lowSar / cohort.filter((r) => r.rating === "Low").length
    : 0;

  // Stability: High band should stay >60% adverse concentration in top decile
  const sorted = [...cohort].sort((a, b) => b.composite - a.composite);
  const topDecile = sorted.slice(0, Math.ceil(cohort.length * 0.1));
  const stabilityScore = topDecile.filter((r) => r.adverseOutcome).length / (topDecile.length || 1);

  return { outcome, tuningCalculator, tuningCram, falseNegativeProxy, stabilityScore: +stabilityScore.toFixed(3) };
}
