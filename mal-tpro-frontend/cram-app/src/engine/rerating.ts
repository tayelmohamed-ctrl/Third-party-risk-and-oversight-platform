// Mal FinCrime OS — dynamic re-rating engine (fixes Theme #1: static ratings).
// Pure & deterministic. Turns a one-off score into a living, event-driven assessment
// with a periodic-review scheduler. No I/O here; persistence lives in the store.
import {
  scoreWithDataQualityGate,
  scoreWithSnapshotGate,
  validKycDemo,
  type AssessmentCapture,
  type DataQualityVerdict,
  type KycQualityContext,
} from "./dataQualityGate";
import { normalizeScoreInput } from "./normalizeInput";
import type { ScoreInput, ScoreResult, FinalRating, Band, Boundary, Score, OverrideHit } from "./types";

// ---- Triggers that cause a re-rating ----
export type Trigger =
  | "ONBOARDING"
  | "PERIODIC_REVIEW"        // scheduler-driven (Low 5y / Med 3y / High 1y)
  | "ADVERSE_MEDIA"          // negative news hit
  | "SAR_FILED"              // a SAR/STR was filed on the customer
  | "OWNERSHIP_CHANGE"       // UBO / control change -> re-verify
  | "SANCTIONS_LIST_UPDATE"  // list refreshed and the customer now matches
  | "PEP_STATUS_CHANGE"      // newly identified as a PEP
  | "TRANSACTION_ANOMALY"    // monitoring alert: behaviour inconsistent
  | "MANUAL_REVIEW";         // analyst/MLRO initiated

export const TRIGGER_LABEL: Record<Trigger, string> = {
  ONBOARDING: "Onboarding",
  PERIODIC_REVIEW: "Periodic review (cadence)",
  ADVERSE_MEDIA: "Adverse media hit",
  SAR_FILED: "SAR/STR filed",
  OWNERSHIP_CHANGE: "Ownership / UBO change",
  SANCTIONS_LIST_UPDATE: "Sanctions/PEP list match",
  PEP_STATUS_CHANGE: "PEP status change",
  TRANSACTION_ANOMALY: "Transaction anomaly",
  MANUAL_REVIEW: "Manual review",
};

// ---- Review cadence (MLRO-set: Low 5y / Med 3y / High 1y) ----
export const REVIEW_MONTHS: Record<FinalRating, number> = { Low: 60, Medium: 36, High: 12, Prohibited: 0 };

export function addMonths(d: Date, months: number): Date {
  const x = new Date(d);
  x.setMonth(x.getMonth() + months);
  return x;
}
export function nextReviewDate(rating: FinalRating, from: Date = new Date()): string {
  const m = REVIEW_MONTHS[rating];
  return addMonths(from, m).toISOString();
}

export interface OverrideGovernanceRecord {
  requestedBand: import("./types").Band | "";
  appliedRating: FinalRating;
  mathBand: Band;
  floor: "PROHIBITED" | "HIGH" | "MEDIUM" | null;
  justification: string;
  approvedBy: string;
  roles: string[];
  nonDilutionEnforced: true;
  at: string;
}

// ---- A persisted assessment record (a point on the customer's timeline) ----
export interface Assessment {
  id: string;
  customerId: string;
  customerName: string;
  at: string;            // ISO timestamp of this assessment
  trigger: Trigger;
  triggerNote?: string;
  rating: FinalRating;
  prevRating?: FinalRating;
  composite: number;
  mathBand: Band;
  boundary: Boundary;
  overrides: OverrideHit[];
  reviewDue: string;     // ISO date the next periodic review is due
  actor: string;
  input: ScoreInput;     // snapshot, so any score is fully reproducible
  /** Original capture for DQ-gated re-rating (when available) */
  capture?: AssessmentCapture;
  /** KYC quality context for DQ-gated re-rating */
  kycContext?: KycQualityContext;
  /** MLRO rationale — required when input.manualOverride is set; stored immutably */
  overrideJustification?: string;
  /** Server-enforced override audit trail (RBAC + non-dilution) */
  governance?: OverrideGovernanceRecord;
  /** Golden thread operational hand-off (CDD/EDD · TM profile · approval) */
  handoff?: OperationalHandoffRecord;
  /** Model provenance — SR 11-7 reproducibility */
  modelVersionId?: string;
  boundarySetUsed?: string;
  libraryVersions?: import("../config/modelProvenance").LibraryVersionsSnapshot;
}

export interface OperationalHandoffRecord {
  mode: "individual" | "entity";
  controls: import("./cramSuiteConfig").ControlInputs;
  disposition: string;
  dueDiligence: string;
  approvalAuthority: string;
  reviewMonths: number | null;
  monitoringIntensity: string;
  residualLevel: string;
  monitoring?: import("./goldenThread").MonitoringProfile | null;
  ops?: {
    checks: Record<string, boolean>;
    approved: boolean;
    approvedBy?: string;
    approvedAt?: string;
    deployed: boolean;
    deployedAt?: string;
  };
}

export type ReRateOutcome =
  | { ok: true; assessment: Assessment }
  | { ok: false; verdict: DataQualityVerdict; prev: Assessment };

function uid(): string {
  try { return crypto.randomUUID(); } catch { return "a_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
}

// Build an Assessment from an input + result (used by onboarding, manual, and re-rating).
export function buildAssessment(args: {
  customerId: string; customerName: string; input: ScoreInput; result: ScoreResult;
  trigger: Trigger; triggerNote?: string; actor: string; prevRating?: FinalRating;
  at?: Date; boundary?: Boundary;
  capture?: AssessmentCapture;
  kycContext?: KycQualityContext;
}): Assessment {
  const at = args.at ?? new Date();
  return {
    id: uid(),
    customerId: args.customerId,
    customerName: args.customerName,
    at: at.toISOString(),
    trigger: args.trigger,
    triggerNote: args.triggerNote,
    rating: args.result.finalRating,
    prevRating: args.prevRating,
    composite: args.result.composite,
    mathBand: args.result.mathBand,
    boundary: args.boundary ?? args.result.boundary,
    overrides: args.result.overrides,
    reviewDue: nextReviewDate(args.result.finalRating, at),
    actor: args.actor,
    input: args.input,
    capture: args.capture,
    kycContext: args.kycContext,
  };
}

/** Mirror applyTrigger for AssessmentCapture — keeps re-rating on the DQ path. */
export function applyTriggerToCapture(capture: AssessmentCapture, trigger: Trigger): AssessmentCapture {
  const c: AssessmentCapture = { ...capture };
  switch (trigger) {
    case "ADVERSE_MEDIA":
      c.adverse = "True Match";
      break;
    case "SAR_FILED":
      c.strs = "3";
      c.investigations = "3";
      break;
    case "OWNERSHIP_CHANGE":
      if (c.mode === "entity") {
        c.uboStatus = "complex_pending";
        c.uboLayers = String(Math.max(+(c.uboLayers || "1"), 2));
      }
      break;
    case "SANCTIONS_LIST_UPDATE":
      c.sanctions = "True Match";
      break;
    case "PEP_STATUS_CHANGE":
      if (c.pep === "None") c.pep = "Foreign";
      break;
    case "TRANSACTION_ANOMALY": {
      c.actualMonthlyBand = String(Math.max(+(c.actualMonthlyBand || "1"), 3));
      c.investigations = String(Math.max(+(c.investigations || "1"), 2));
      break;
    }
    default:
      break;
  }
  return c;
}

// ---- Event-driven re-rating: an event mutates the snapshot, then we re-score ----
export function applyTrigger(input: ScoreInput, trigger: Trigger): ScoreInput {
  const i: ScoreInput = { ...normalizeScoreInput(input) };
  switch (trigger) {
    case "ADVERSE_MEDIA":
      i.adverse = "True Match"; break;
    case "SAR_FILED":
      i.strsScore = 3 as Score; i.investigationsScore = 3 as Score; break;
    case "OWNERSHIP_CHANGE":
      // UBO/control change — re-verify ownership (Policy §12.2; OVR-004 pending)
      if (i.legalForm !== "natural") {
        i.uboStatus = "complex_pending";
        i.uboLayers = Math.max(i.uboLayers ?? 1, 2);
      }
      i.natureOfBusinessScore = Math.max(i.natureOfBusinessScore, 2) as Score;
      break;
    case "SANCTIONS_LIST_UPDATE":
      i.sanctions = "True Match"; break;
    case "PEP_STATUS_CHANGE":
      if (i.pep === "None") i.pep = "Foreign"; break;
    case "TRANSACTION_ANOMALY": {
      const base = normalizeScoreInput(input);
      i.actualMonthlyBand = Math.max(base.actualMonthlyBand, 3) as Score;
      i.investigationsScore = Math.max(i.investigationsScore, 2) as Score;
      break;
    }
    case "PERIODIC_REVIEW":
    case "MANUAL_REVIEW":
    case "ONBOARDING":
    default:
      break; // re-score on the same (or freshly verified) inputs
  }
  return i;
}

/** Score after trigger — always passes through DQ gate (capture or snapshot path). */
function scoreAfterTrigger(
  prev: Assessment,
  trigger: Trigger,
  boundary: Boundary,
  at: Date,
): { ok: true; input: ScoreInput; result: ScoreResult; capture?: AssessmentCapture; kycContext?: KycQualityContext }
  | { ok: false; verdict: DataQualityVerdict } {
  const kyc = prev.kycContext ?? validKycDemo();

  if (prev.capture) {
    const newCapture = applyTriggerToCapture(prev.capture, trigger);
    const gated = scoreWithDataQualityGate(newCapture, kyc, boundary, at);
    if (!gated.ready) return { ok: false, verdict: gated.verdict };
    return { ok: true, input: gated.input, result: gated.result, capture: newCapture, kycContext: kyc };
  }

  const newInput = applyTrigger(prev.input, trigger);
  const gated = scoreWithSnapshotGate(newInput, kyc, boundary, at);
  if (!gated.ready) return { ok: false, verdict: gated.verdict };
  return { ok: true, input: gated.input, result: gated.result, kycContext: kyc };
}

// Produce the next assessment from a previous one + a trigger.
export function reRate(
  prev: Assessment,
  trigger: Trigger,
  note: string,
  actor: string,
  boundary?: Boundary,
  at?: Date,
): ReRateOutcome {
  const b = boundary ?? prev.boundary;
  const when = at ?? new Date();
  const scored = scoreAfterTrigger(prev, trigger, b, when);
  if (!scored.ok) {
    return { ok: false, verdict: scored.verdict, prev };
  }
  return {
    ok: true,
    assessment: buildAssessment({
      customerId: prev.customerId,
      customerName: prev.customerName,
      input: scored.input,
      result: scored.result,
      trigger,
      triggerNote: note,
      actor,
      prevRating: prev.rating,
      boundary: b,
      at: when,
      capture: scored.capture ?? prev.capture,
      kycContext: scored.kycContext ?? prev.kycContext,
    }),
  };
}

// ---- Scheduler helpers ----
export function isReviewDue(a: Assessment, asOf: Date = new Date()): boolean {
  if (a.rating === "Prohibited") return false; // exit/freeze, not periodic review
  return new Date(a.reviewDue).getTime() <= asOf.getTime();
}
export function daysUntil(iso: string, asOf: Date = new Date()): number {
  return Math.round((new Date(iso).getTime() - asOf.getTime()) / 86400000);
}
export function ratingDelta(prev: FinalRating | undefined, next: FinalRating): "up" | "down" | "same" | "new" {
  if (!prev) return "new";
  const order = { Low: 1, Medium: 2, High: 3, Prohibited: 4 } as Record<FinalRating, number>;
  return order[next] > order[prev] ? "up" : order[next] < order[prev] ? "down" : "same";
}
