import type { Band, FinalRating, ScoreResult, ScoreInput } from "./types";
import { CFG, type ControlKey, type ControlInputs, type ControlRating } from "./cramSuiteConfig";
import { entityTypeProhibited } from "../config/entityLegalTypes";

export interface ControlRow {
  key: ControlKey;
  label: string;
  rating: ControlRating;
  weight: number;
  contribution: number;
}

export interface ResidualResult {
  controlRows: ControlRow[];
  effectiveness: number;
  reduction: number;
  inherentScore: number;
  residualScore: number;
  residualLevel: FinalRating | Band;
  residualNote: string;
  capped: boolean;
  withinAppetite: boolean;
  appetiteText: string;
  controlGap: boolean;
}

const BAND_IDX: Record<string, number> = { Low: 0, LOW: 0, Medium: 1, MEDIUM: 1, High: 2, HIGH: 2, Prohibited: 3, PROHIBITED: 3 };

function bandFromScore(score: number): Band {
  if (score <= CFG.bands.mediumFloor) return "Low";
  if (score <= CFG.bands.highFloor) return "Medium";
  return "High";
}

export function computeResidual(
  inherentScore: number,
  inherentLevel: FinalRating,
  controls: ControlInputs,
  labels: Record<ControlKey, string>,
  gates: { prohibited: boolean; overrideToHigh: boolean },
): ResidualResult {
  const cw = CFG.controlWeights;
  let effRaw = 0;
  const controlRows: ControlRow[] = (Object.keys(cw) as ControlKey[]).map((key) => {
    const rating = controls[key];
    const wt = cw[key];
    const contrib = rating * (wt / 100);
    effRaw += contrib;
    return { key, label: labels[key], rating, weight: wt, contribution: contrib };
  });

  const effectiveness = effRaw / 3;
  const maxRed = CFG.residual.maxReduction / 100;
  const reduction = effectiveness * maxRed;

  const inhIdx = BAND_IDX[inherentLevel] ?? BAND_IDX[bandFromScore(inherentScore)];
  const minIdx = Math.max(0, inhIdx - CFG.residual.oneBandCap);
  const floorVal = minIdx === 2 ? CFG.bands.highFloor : minIdx === 1 ? CFG.bands.mediumFloor : 0;

  let residualScore = inherentScore * (1 - reduction);
  let capped = false;
  if (residualScore < floorVal) {
    residualScore = floorVal;
    capped = true;
  }

  let residualLevel: FinalRating | Band;
  let residualNote = "";
  if (gates.prohibited) {
    residualLevel = "Prohibited";
    residualNote = "held: prohibition";
  } else if (gates.overrideToHigh) {
    residualLevel = "High";
    residualScore = Math.max(residualScore, CFG.bands.highFloor);
    residualNote = "held High: override gate";
  } else {
    residualLevel = bandFromScore(residualScore);
    if (capped) residualNote = "capped at one-band step-down";
  }

  const appIdx = BAND_IDX[CFG.residual.appetite];
  const resIdx = BAND_IDX[residualLevel];
  const withinAppetite = !gates.prohibited && resIdx <= appIdx;
  const appetiteText = gates.prohibited
    ? "Prohibited — exit / decline"
    : withinAppetite
      ? "Within risk appetite"
      : "Exceeds appetite — escalate";

  const inhIsHigh = inherentLevel === "High" || inherentLevel === "Prohibited";
  const controlGap = inhIsHigh && effectiveness * 100 < CFG.residual.gapThreshold;

  return {
    controlRows, effectiveness, reduction, inherentScore: inherentScore,
    residualScore, residualLevel, residualNote, capped, withinAppetite, appetiteText, controlGap,
  };
}

export function gatesFromResult(result: ScoreResult, input: ScoreInput): {
  prohibited: boolean;
  overrideToHigh: boolean;
  pepAny: boolean;
  flags: { name: string; on: boolean; status: string }[];
} {
  const pepAny = input.pep !== "None";
  const prohibited = result.finalRating === "Prohibited" || result.floor === "PROHIBITED";
  const overrideToHigh = result.floor === "HIGH" || result.overrides.some((o) => o.cls === "HIGH" || o.cls === "PROHIBITED");

  const flags = [
    { name: "PEP", on: pepAny, status: input.pep === "Foreign" || input.pep === "IO" ? "OVERRIDE" : pepAny ? "Enhanced" : "Clear" },
    { name: "Sanctions screening", on: input.sanctions !== "Clear", status: input.sanctions === "True Match" ? "PROHIBIT" : input.sanctions === "Potential Match" ? "OVERRIDE" : "Clear" },
    { name: "Investigations", on: input.investigationsScore >= 3, status: input.investigationsScore >= 3 ? "OVERRIDE" : "Clear" },
    { name: "STR / SAR", on: input.strsScore >= 3, status: input.strsScore >= 3 ? "OVERRIDE" : "Clear" },
    { name: "Beneficial ownership (OVR-004)", on: input.legalForm !== "natural" && input.uboStatus !== "verified", status: input.uboStatus === "refused" ? "PROHIBIT" : input.uboStatus === "complex_pending" ? "OVERRIDE" : "Clear" },
    { name: "Expected vs actual behaviour", on: result.behaviourGate?.reviewRequired ?? (input.actualMonthlyBand ?? 1) > (input.expectedMonthlyBand ?? 1), status: result.behaviourGate?.overrideHigh ? "OVERRIDE" : result.behaviourGate?.gateType === "flag" ? "REVIEW" : "Clear" },
    { name: "Prohibited entity type", on: entityTypeProhibited(input.declaredEntityType), status: entityTypeProhibited(input.declaredEntityType) ? "PROHIBIT" : "Clear" },
    { name: "MLRO manual override", on: result.overridden, status: result.overridden ? "APPLIED" : "Off" },
  ];

  return { prohibited, overrideToHigh, pepAny, flags };
}
