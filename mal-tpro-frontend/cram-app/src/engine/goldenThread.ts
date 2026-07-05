// Golden thread — rating explicitly drives executed CDD/EDD, approval, monitoring (Policy §12; CRAM Suite)
import type { ScoreInput, ScoreResult, FinalRating, Band } from "./types";
import { isMaterialActivityDeviation, activityDeviationScore } from "./activityProfile";
import { CFG, resolveDueDiligenceLevel, type ControlInputs, type CustomerMode } from "./cramSuiteConfig";
import { pepTriggersEnhancedMeasures } from "../config/pepGate";
import type { CompliancePerimeter } from "../config/perimeters";
import { policyProfileForPerimeter } from "../registries/policyProfiles";
import { OUTCOMES } from "./cram";
import { computeResidual, gatesFromResult, type ResidualResult } from "./residualLayer";

export interface EddWorkflowItem {
  id: string;
  required: boolean;
  text: string;
}

export interface MonitoringProfile {
  intensity: string;
  currency: "AED" | "USD";
  singleTxnAlertAed: number;
  monthlyCumulativeAlertAed: number;
  structuringWatchAed: number;
  sanctionsRescreen: string;
  adverseMediaSweep: string;
  periodicKycReview: string;
}

export interface ApprovalAuthority {
  who: string;
  cls: "LOW" | "MEDIUM" | "HIGH" | "PROHIBITED";
}

export interface GoldenThreadResult {
  mode: CustomerMode;
  inherentLevel: FinalRating;
  inherentScore: number;
  dueDiligence: string;
  eddRequired: boolean;
  reviewMonths: number | null;
  nextReviewDate: string | null;
  approval: ApprovalAuthority;
  monitoring: MonitoringProfile | null;
  eddItems: EddWorkflowItem[];
  disposition: "STANDARD_CDD" | "EDD_REQUIRED" | "DECLINE_EXIT";
  dispositionText: string;
  subText: string;
  residual: ResidualResult;
  gates: ReturnType<typeof gatesFromResult>;
  outcome: (typeof OUTCOMES)[FinalRating];
  monitoringIntensity: string;
}

function eddRequired(
  rating: FinalRating,
  input: ScoreInput,
  result: ScoreResult,
): boolean {
  if (rating === "Prohibited") return true;
  return rating === "High";
}

function authority(
  rating: FinalRating,
  edd: boolean,
  input: ScoreInput,
  result: ScoreResult,
  perimeter: CompliancePerimeter,
): ApprovalAuthority {
  if (rating === "Prohibited") {
    return {
      who: perimeter === "global_account" ? "US CO / MLRO + BaaS partner" : "MLRO + Financial Crime Committee",
      cls: "PROHIBITED",
    };
  }
  if (input.pep === "Foreign" || edd) {
    return { who: perimeter === "global_account" ? "US CO / MLRO sign-off" : "MLRO sign-off required", cls: "HIGH" };
  }
  if (rating === "High") {
    return { who: perimeter === "global_account" ? "US CO / MLRO" : "Head of Compliance / MLRO", cls: "HIGH" };
  }
  if (input.pep === "Domestic" || input.pep === "IO") {
    const pepNote = perimeter === "global_account"
      ? "Identify PEP · FinCEN CDD Rule"
      : "Identify PEP · standard CDD unless high-risk relationship (Art. 15 Second)";
    return { who: pepNote, cls: "LOW" };
  }
  if (rating === "Medium") {
    return { who: perimeter === "global_account" ? "Operations / Compliance" : "Branch / team lead + Compliance", cls: "MEDIUM" };
  }
  return { who: "Relationship manager (auto)", cls: "LOW" };
}

function eddWorkflowItems(
  rating: FinalRating,
  input: ScoreInput,
  result: ScoreResult,
  residual: ResidualResult,
  pepAny: boolean,
  mode: CustomerMode,
  perimeter: CompliancePerimeter,
): EddWorkflowItem[] {
  const items: EddWorkflowItem[] = [];
  const weak = residual.controlRows.filter((c) => c.rating < 2).map((c) => c.label);

  if (rating === "Prohibited") {
    items.push({ id: "x_decline", required: true, text: "Decline onboarding / initiate exit of the relationship" });
    if (input.sanctions === "True Match") {
      items.push({ id: "x_freeze", required: true, text: "Freeze per sanctions obligations and report — do not tip off" });
    }
    items.push({ id: "x_str", required: true, text: "Assess and, where warranted, file an STR/SAR" });
    items.push({ id: "x_committee", required: true, text: "Refer disposition to the Financial Crime Committee for record" });
    return items;
  }

  if (eddRequired(rating, input, result)) {
    items.push({ id: "e_sow", required: true, text: "Corroborate source of funds & source of wealth with documentary evidence" });
    items.push({ id: "e_approval", required: true, text: "Obtain senior management / MLRO approval to establish or continue the relationship" });
    items.push({ id: "e_mon", required: true, text: "Apply enhanced ongoing monitoring at the reduced thresholds below" });
  }

  if (pepAny) {
    items.push({ id: "e_pep", required: true, text: "Record PEP category (Foreign / Domestic / IO), position and tenure; complete the PEP declaration" });
    if (input.pep === "Domestic" || input.pep === "IO") {
      items.push({
        id: "e_pep_id",
        required: true,
        text: perimeter === "global_account"
          ? "Confirm PEP identification and enhanced monitoring per FinCEN CDD Rule"
          : "Confirm sufficient measures to identify domestic or international-organization PEP per CBUAE Art. 15(14) Second",
      });
    }
    if (pepTriggersEnhancedMeasures(input.pep, result.mathBand, input, perimeter)) {
      items.push({ id: "e_pep2", required: false, text: "Screen close associates / family and establish ultimate source of wealth" });
    }
  }
  if (input.sanctions === "Potential Match") {
    items.push({ id: "e_scr", required: true, text: "Escalate the partial screening match to the sanctions team; hold pending disposition" });
  }
  if (input.legalForm !== "natural" && input.uboStatus !== "verified") {
    items.push({
      id: "e_ubo", required: true,
      text: mode === "entity"
        ? "Obtain & verify UBO / control structure documentation (Policy §12.2; OVR-004)"
        : "Obtain beneficial-ownership documentation where applicable",
    });
  }
  const beh = result.behaviourGate;
  if (beh?.reviewRequired) {
    items.push({
      id: "e_eva",
      required: !!beh.overrideHigh,
      text: "Document expected-vs-actual review; refresh KYC; assess whether an STR is warranted (Policy §12.6)",
    });
  }
  if (input.investigationsScore >= 3) {
    items.push({ id: "e_inv", required: true, text: "Obtain investigations / enquiry context before proceeding" });
  }
  if (input.strsScore >= 3) {
    items.push({ id: "e_str", required: true, text: "Confirm the STR reference and apply post-report handling (no tipping-off)" });
  }
  if (residual.controlGap && weak.length) {
    items.push({ id: "e_gap", required: true, text: `Remediate weak controls: ${weak.join(", ")}` });
  }
  return items;
}

function monitoringProfile(
  rating: FinalRating,
  input: ScoreInput,
  result: ScoreResult,
  reviewMonths: number | null,
  nextReview: string | null,
  controlGap: boolean,
  perimeter: CompliancePerimeter,
  behReview = false,
): MonitoringProfile {
  const currency = perimeter === "global_account" ? "USD" : "AED";
  const expectedTable = perimeter === "global_account" ? CFG.expectedUsd : CFG.expectedAed;
  const ex = expectedTable[input.expectedMonthlyBand ?? 1] ?? expectedTable[2];
  let tol = rating === "Low" ? 1.5 : rating === "Medium" ? 1.25 : 1.0;
  const dev = activityDeviationScore(input.expectedMonthlyBand ?? 1, input.actualMonthlyBand ?? 1);
  if (dev >= 2 || behReview) tol *= 0.8;
  if (controlGap) tol *= 0.85;

  const pepAny = input.pep !== "None";
  const pepEnhanced = pepTriggersEnhancedMeasures(input.pep, result.mathBand, input, perimeter);
  return {
    intensity: rating === "High" ? "Enhanced" : rating === "Medium" ? "Standard" : pepEnhanced ? "Standard" : "Baseline",
    currency,
    singleTxnAlertAed: Math.round(ex.single * tol),
    monthlyCumulativeAlertAed: Math.round(ex.monthly * tol),
    structuringWatchAed: Math.round(ex.single * tol * 0.9),
    sanctionsRescreen: (rating === "High" || input.pep === "Foreign" || pepEnhanced) ? "Daily" : pepAny ? "Weekly" : rating === "Medium" ? "Weekly" : "Monthly",
    adverseMediaSweep: (rating === "High" || input.pep === "Foreign" || pepEnhanced) ? "Quarterly" : pepAny ? "Semi-annual" : rating === "Medium" ? "Semi-annual" : "At review",
    periodicKycReview: reviewMonths ? `Every ${reviewMonths} mo · ${nextReview ?? "—"}` : "—",
  };
}

export function computeGoldenThread(
  mode: CustomerMode,
  input: ScoreInput,
  result: ScoreResult,
  controls: ControlInputs,
  controlLabels: Record<import("./cramSuiteConfig").ControlKey, string>,
  reviewFrom?: Date,
): GoldenThreadResult {
  const perimeter = input.masterRegistryPerimeter ?? "mal_bank";
  const profile = policyProfileForPerimeter(perimeter);
  const gates = gatesFromResult(result, input);
  const residual = computeResidual(result.composite, result.finalRating, controls, controlLabels, gates);
  const pepAny = gates.pepAny;
  const rating = result.finalRating;
  const edd = eddRequired(rating, input, result);
  const auth = authority(rating, edd, input, result, perimeter);
  const reviewMonths = rating === "Prohibited"
    ? null
    : profile.reviewCycles.find((r) => r.band === rating)?.months
      ?? profile.reviewCycles.find((r) => r.band === "Medium")?.months
      ?? 36;
  let nextReviewDate: string | null = null;
  if (reviewMonths && reviewFrom) {
    const d = new Date(reviewFrom);
    d.setMonth(d.getMonth() + reviewMonths);
    nextReviewDate = d.toISOString().slice(0, 10);
  }

  const monitoring = rating === "Prohibited"
    ? null
    : monitoringProfile(rating, input, result, reviewMonths, nextReviewDate, residual.controlGap, perimeter, result.behaviourGate?.reviewRequired);

  const eddItems = eddWorkflowItems(rating, input, result, residual, pepAny, mode, perimeter);
  const dd = resolveDueDiligenceLevel(rating, edd, pepAny);
  const outcome = OUTCOMES[rating];

  let disposition: GoldenThreadResult["disposition"];
  let dispositionText: string;
  let subText: string;
  if (rating === "Prohibited") {
    disposition = "DECLINE_EXIT";
    dispositionText = "DECLINE / EXIT";
    subText = "Relationship cannot be onboarded — exit pathway and reporting obligations apply.";
  } else if (edd) {
    disposition = "EDD_REQUIRED";
    dispositionText = "EDD REQUIRED";
    subText = "Enhanced due diligence must be completed and approved before the relationship is onboarded.";
  } else {
    disposition = "STANDARD_CDD";
    dispositionText = "STANDARD CDD";
    subText = "Within appetite — proceeds on standard controls; the monitoring profile applies automatically.";
  }

  return {
    mode, inherentLevel: rating, inherentScore: result.composite,
    dueDiligence: dd, eddRequired: edd, reviewMonths, nextReviewDate,
    approval: auth, monitoring, eddItems, disposition, dispositionText, subText,
    residual, gates, outcome,
    monitoringIntensity: monitoring?.intensity ?? "—",
  };
}

/** Operational gate — can onboarding proceed? */
export function onboardingGate(
  gt: GoldenThreadResult,
  eddChecks: Record<string, boolean>,
  approved: boolean,
  deployed: boolean,
): { status: "blocked" | "ready" | "done" | "exit" | "auto"; message: string; canApprove: boolean; canDeploy: boolean } {
  const reqIds = gt.eddItems.filter((i) => i.required).map((i) => i.id);
  const reqDone = reqIds.filter((id) => eddChecks[id]).length;
  const allReq = reqDone === reqIds.length;

  if (gt.inherentLevel === "Prohibited") {
    return {
      status: allReq ? "exit" : "blocked",
      message: allReq ? "Exit actions recorded — refer to the Financial Crime Committee" : `Complete exit & reporting actions (${reqDone}/${reqIds.length})`,
      canApprove: false, canDeploy: false,
    };
  }
  if (approved) {
    return { status: "done", message: "Approval recorded — onboarding cleared", canApprove: false, canDeploy: !deployed };
  }
  if (!gt.eddRequired && gt.approval.cls === "LOW") {
    return { status: "auto", message: "Cleared for onboarding — relationship-manager auto-approval", canApprove: false, canDeploy: !deployed };
  }
  if (gt.eddRequired && !allReq) {
    return { status: "blocked", message: `Blocked — ${reqDone}/${reqIds.length} required EDD steps complete`, canApprove: false, canDeploy: false };
  }
  return {
    status: "ready",
    message: `Ready for ${gt.approval.who.replace(" required", "")} — record approval to onboard`,
    canApprove: true, canDeploy: !deployed,
  };
}

export function handoffSignature(gt: GoldenThreadResult): string {
  const mon = gt.monitoring;
  return JSON.stringify([
    gt.inherentLevel, gt.dueDiligence, gt.eddRequired,
    gt.eddItems.map((i) => i.id),
    mon ? [mon.singleTxnAlertAed, mon.monthlyCumulativeAlertAed, mon.sanctionsRescreen] : null,
  ]);
}
