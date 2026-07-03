/**
 * Expected-vs-actual behaviour gate — CRAM Suite HTML parity (Policy §12.6).
 * Drives MLRO review / override workflow; light uplift only in transaction factor.
 */
import type { Score } from "../engine/types";

export type BehaviourGateType = "clear" | "flag" | "override";

export type BehaviourStatus =
  | "not_yet_established"
  | "in_line"
  | "moderately_above"
  | "significantly_exceeds"
  | "inconsistent_profile";

export interface BehaviourGateDef {
  id: BehaviourStatus;
  label: string;
  gateType: BehaviourGateType;
  /** Light transaction-factor uplift (1–3); clear paths stay at 1 */
  transactionUplift: Score;
}

export const BEHAVIOUR_STATUSES: readonly BehaviourGateDef[] = [
  { id: "not_yet_established", label: "Not yet established (new)", gateType: "clear", transactionUplift: 1 },
  { id: "in_line", label: "Actual in line with expected", gateType: "clear", transactionUplift: 1 },
  { id: "moderately_above", label: "Actual moderately above expected (≤3×)", gateType: "flag", transactionUplift: 2 },
  { id: "significantly_exceeds", label: "Actual significantly exceeds expected (>3×)", gateType: "override", transactionUplift: 2 },
  { id: "inconsistent_profile", label: "Inconsistent with profile / structuring", gateType: "override", transactionUplift: 2 },
] as const;

const BY_ID = Object.fromEntries(BEHAVIOUR_STATUSES.map((b) => [b.id, b])) as Record<BehaviourStatus, BehaviourGateDef>;

export function resolveBehaviourGate(status: BehaviourStatus | string | undefined): BehaviourGateDef {
  return BY_ID[(status as BehaviourStatus) ?? "in_line"] ?? BY_ID.in_line;
}

/** Suggest gate status from TM band delta — analyst may override via dropdown. */
export function suggestBehaviourStatus(
  expected: Score,
  actual: Score,
  lifecycle: "New" | "Existing" = "Existing",
): BehaviourStatus {
  if (lifecycle === "New" && actual <= expected) return "not_yet_established";
  const delta = actual - expected;
  if (delta <= 0) return "in_line";
  if (delta === 1) return "moderately_above";
  return "significantly_exceeds";
}

export function behaviourStatusFromCapture(value: string, fallback: BehaviourStatus): BehaviourStatus {
  if (value && value in BY_ID) return value as BehaviourStatus;
  return fallback;
}
