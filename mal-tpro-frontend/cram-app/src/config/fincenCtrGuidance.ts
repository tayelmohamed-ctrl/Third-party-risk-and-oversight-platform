/** FinCEN Currency Transaction Report (Form 104) — US BaaS programme. */

export const CTR_THRESHOLD_USD = 10_000;

/** 31 CFR 1010.311 — file within 15 days of the transaction date. */
export const CTR_FILING_DEADLINE_DAYS = 15;

export const FINCEN_CTR_FORM = "104";

export const CTR_FILING_SLA = {
  thresholdUsd: CTR_THRESHOLD_USD,
  deadlineDays: CTR_FILING_DEADLINE_DAYS,
  policyRef: "31 USC 5313 · 31 CFR 1010.311 · FinCEN Form 104",
  system: "FinCEN BSA E-File",
} as const;

export function ctrDueDate(transactionDate: Date): Date {
  const d = new Date(transactionDate);
  d.setDate(d.getDate() + CTR_FILING_DEADLINE_DAYS);
  return d;
}

export function warrantsCtrReporting(input: {
  licenseRegion: string;
  amountUsd: number;
  channel?: string | null;
  isCash?: boolean;
}): boolean {
  if (input.licenseRegion !== "US") return false;
  if (input.amountUsd < CTR_THRESHOLD_USD) return false;
  if (input.isCash === false) return false;
  const ch = (input.channel ?? "").toLowerCase();
  if (ch && !ch.includes("cash") && !ch.includes("atm") && !ch.includes("branch")) {
    return false;
  }
  return true;
}

export function aggregateExceedsThreshold(cashIn: number, cashOut: number): number {
  return Math.max(cashIn, cashOut, cashIn + cashOut);
}
