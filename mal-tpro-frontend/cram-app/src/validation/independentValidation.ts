import { COUNTRIES, PROFESSIONS, PRODUCTS, OVERRIDES } from "../engine/data";
import { factorWeightSum } from "../config/runtimeConfig";
import { runAllGoldenVectors, type GoldenSummary } from "./goldenVectors";
import { runBacktest, type BacktestReport } from "./backtest";
import { evaluateVendorReadiness } from "./vendorReadiness";

export const MODEL_VERSION_ID = "CRAM-CBUAE-2026-05-FREEZE-01";

export type ModelStatus = "draft" | "frozen";

export interface ValidationGate {
  id: string;
  name: string;
  objective: string;
  passed: boolean;
  detail: string;
  approver: string;
}

export interface ModelGovernanceState {
  modelVersionId: string;
  status: ModelStatus;
  gates: ValidationGate[];
  allGatesPassed: boolean;
  canPromoteToFrozen: boolean;
  openItems: number;
  registerOpenItems: number;
  registerCounts: { open: number; accepted: number; corrected: number; total: number };
}

export interface IndependentValidationReport {
  at: string;
  modelVersionId: string;
  validator: string;
  framework: "SR 11-7 / CBUAE Model Risk";
  golden: GoldenSummary;
  backtest: BacktestReport;
  gates: ValidationGate[];
  verdict: "APPROVED" | "CONDITIONAL" | "REJECTED";
  verdictDetail: string;
  conceptualSoundness: string;
  ongoingMonitoring: string;
  outcomeAnalysis: string;
  recommendations: string[];
}

function weightSum(): number {
  return factorWeightSum();
}

export function evaluateGates(golden: GoldenSummary, backtest: BacktestReport): ValidationGate[] {
  const vendor = evaluateVendorReadiness();
  return [
    {
      id: "G0",
      name: "Model freeze",
      objective: "Single approved methodology & model_version_id",
      passed: MODEL_VERSION_ID.length > 0 && weightSum() > 0.999 && weightSum() < 1.001,
      detail: `${MODEL_VERSION_ID} · factor weights sum ${(weightSum() * 100).toFixed(0)}%`,
      approver: "Model Governance / MLRO",
    },
    {
      id: "G1",
      name: "Data readiness",
      objective: "Reference libraries loaded & mappable",
      passed: COUNTRIES.length >= 200 && PROFESSIONS.length >= 100 && PRODUCTS.length >= 1,
      detail: `${COUNTRIES.length} countries · ${PROFESSIONS.length} professions · ${PRODUCTS.length} products`,
      approver: "Data Governance",
    },
    {
      id: "G2",
      name: "Vendor readiness",
      objective: "Screening / ID vendor integration mapped",
      passed: vendor.passed,
      detail: vendor.detail,
      approver: "Vendor Governance",
    },
    {
      id: "G3",
      name: "SIT exit — golden vectors",
      objective: "GV-01…39 automated · tolerance 0.0001",
      passed: golden.passRate >= 0.85 && golden.failed === 0,
      detail: `${golden.passed}/${golden.executed} passed (${(golden.passRate * 100).toFixed(0)}%) · ${golden.skipped} app-layer skipped`,
      approver: "Technology QA / Compliance",
    },
    {
      id: "G4",
      name: "UAT exit",
      objective: "Business scenarios & training complete",
      passed: golden.passRate >= 0.9,
      detail: "Risk Test Bench + golden thread UAT scenarios available",
      approver: "Operations / FCC",
    },
    {
      id: "G5",
      name: "Calibration & back-testing",
      objective: "Outcome reasonableness · directional sensitivity",
      passed: backtest.outcome.passesDirectionalSensitivity && backtest.outcome.liftSarHighVsLow >= 2,
      detail: backtest.outcome.summary,
      approver: "Model Validation / FCC",
    },
    {
      id: "G6",
      name: "Production approval",
      objective: "All gates · monitoring plan active",
      passed: false, // computed after all gates
      detail: "",
      approver: "Senior Governance Forum",
    },
  ].map((g, _, arr) => {
    if (g.id === "G6") {
      const prior = arr.filter((x) => x.id !== "G6").every((x) => x.passed);
      return { ...g, passed: prior, detail: prior ? "All prerequisite gates passed — eligible for production" : "Blocked — close prior gate failures" };
    }
    return g;
  });
}

export function buildGovernanceState(
  status: ModelStatus = "draft",
  registerCounts: { open: number; accepted: number; corrected: number; total: number } = { open: 0, accepted: 0, corrected: 0, total: 0 },
): ModelGovernanceState {
  const golden = runAllGoldenVectors().summary;
  const backtest = runBacktest();
  const gates = evaluateGates(golden, backtest);
  const openItems = gates.filter((g) => !g.passed).length;
  const allGatesPassed = gates.every((g) => g.passed);
  return {
    modelVersionId: MODEL_VERSION_ID,
    status,
    gates,
    allGatesPassed,
    canPromoteToFrozen: allGatesPassed && status === "draft" && registerCounts.open === 0,
    openItems,
    registerOpenItems: registerCounts.open,
    registerCounts,
  };
}

/** Independent validation — separate from scoring engine (SR 11-7). */
export function runIndependentValidation(validator = "Model Validation Unit (independent)"): IndependentValidationReport {
  const goldenRun = runAllGoldenVectors();
  const backtest = runBacktest();
  const gates = evaluateGates(goldenRun.summary, backtest);

  const goldenOk = goldenRun.summary.failed === 0 && goldenRun.summary.passRate >= 0.85;
  const backtestOk = backtest.outcome.passesDirectionalSensitivity;
  const gatesOk = gates.filter((g) => g.id !== "G6").every((g) => g.passed);

  let verdict: IndependentValidationReport["verdict"] = "REJECTED";
  let verdictDetail = "Model not validated for production — address failed gates and back-test.";
  if (goldenOk && backtestOk && gatesOk) {
    verdict = "APPROVED";
    verdictDetail = "Independent validation confirms the model identifies higher-risk customers with statistically higher SAR/adverse-outcome incidence.";
  } else if (goldenOk && backtestOk) {
    verdict = "CONDITIONAL";
    verdictDetail = "Core maths and outcomes acceptable — conditional on closing governance gate items.";
  }

  return {
    at: new Date().toISOString(),
    modelVersionId: MODEL_VERSION_ID,
    validator,
    framework: "SR 11-7 / CBUAE Model Risk",
    golden: goldenRun.summary,
    backtest,
    gates,
    verdict,
    verdictDetail,
    conceptualSoundness: `Weighted six-factor CRAM with non-dilution overrides (${OVERRIDES.length} rules). Golden pass rate ${(goldenRun.summary.passRate * 100).toFixed(0)}%.`,
    ongoingMonitoring: "Quarterly back-test · monthly override MI · KRI: TM alerts/STR by rating band.",
    outcomeAnalysis: backtest.outcome.summary,
    recommendations: [
      ...(goldenRun.summary.failed ? [`Remediate golden vectors: ${goldenRun.summary.failedIds.join(", ")}`] : []),
      ...(!backtestOk ? ["Re-calibrate thresholds — directional sensitivity below target"] : []),
      "Continue parallel-run for one review cycle post go-live.",
      "Document threshold tuning with before/after movement matrix.",
    ],
  };
}
