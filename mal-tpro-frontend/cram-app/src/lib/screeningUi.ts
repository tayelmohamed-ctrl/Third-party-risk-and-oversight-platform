/** SLA helpers for screening disposition queue (Phase 1c). */
import { SCREENING_SLA } from "../config/partnerIntegration";
import type { ScreeningCaseRecord } from "../lib/api";

export function isSlaBreached(record: ScreeningCaseRecord): boolean {
  if (!record.slaDueAt || record.disposition !== "pending") return false;
  return new Date(record.slaDueAt).getTime() < Date.now();
}

export function slaRemaining(slaDueAt: string | null): { label: string; breached: boolean; urgent: boolean } {
  if (!slaDueAt) return { label: "—", breached: false, urgent: false };
  const ms = new Date(slaDueAt).getTime() - Date.now();
  if (ms <= 0) return { label: "Breached", breached: true, urgent: true };
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return {
    label: h > 0 ? `${h}h ${m}m` : `${m}m`,
    breached: false,
    urgent: ms < SCREENING_SLA.potentialMatchHours * 3_600_000 * 0.25,
  };
}

export const STATUS_PILL: Record<string, string> = {
  pending: "bg-med/15 text-med",
  potential: "bg-hi/15 text-hi",
  true_match: "bg-proh/25 text-[#ff7ea0]",
  clear: "bg-low/15 text-low",
  false_positive: "bg-low/15 text-low",
};

export const ONBOARDING_STATE_PILL: Record<string, string> = {
  INITIATED: "bg-panel2 text-muted",
  KYC_PENDING: "bg-med/15 text-med",
  SCREENING_PENDING: "bg-med/15 text-med",
  DISPOSITION_REQUIRED: "bg-hi/15 text-hi",
  READY_TO_SCORE: "bg-ai/15 text-[#c9b6f5]",
  SCORED: "bg-low/15 text-low",
  BLOCKED: "bg-proh/25 text-[#ff7ea0]",
  CLEARED: "bg-low/15 text-low",
};

export function onboardingStateLabel(state: string): string {
  return state.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}
