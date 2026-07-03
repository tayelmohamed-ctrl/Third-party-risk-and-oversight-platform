/**
 * Vital4 → CRAM screening normalization.
 * Sole authority per Phase 0 — docs/19-PARTNER-INTEGRATION-PHASE0-SIGNOFF.md
 */
import type { AdverseResult, PepStatus, ScreenResult } from "../../src/engine/types";
import type { ScreeningCaseStatus, ScreeningDisposition, ScreeningSnapshot, Vital4WebhookPayload } from "./types";

const SANCTIONS_MAP: Record<string, ScreenResult> = {
  clear: "Clear",
  no_match: "Clear",
  false_positive: "Clear",
  potential: "Potential Match",
  potential_match: "Potential Match",
  true_match: "True Match",
  confirmed: "True Match",
  hit: "True Match",
};

const PEP_MAP: Record<string, PepStatus> = {
  clear: "None",
  no_match: "None",
  none: "None",
  domestic: "Domestic",
  foreign: "Foreign",
  io: "IO",
  international: "IO",
};

const ADVERS_MAP: Record<string, AdverseResult> = {
  clear: "None",
  none: "None",
  no_match: "None",
  false_positive: "None",
  potential: "Potential",
  potential_match: "Potential",
  true_match: "True Match",
  confirmed: "True Match",
};

export function normalizeToken(v: string | undefined): string {
  return (v ?? "clear").toLowerCase().replace(/\s+/g, "_");
}

export function mapSanctions(v: string | undefined): ScreenResult {
  return SANCTIONS_MAP[normalizeToken(v)] ?? "Clear";
}

export function mapPep(v: string | undefined): PepStatus {
  return PEP_MAP[normalizeToken(v)] ?? "None";
}

export function mapAdverse(v: string | undefined): AdverseResult {
  return ADVERS_MAP[normalizeToken(v)] ?? "None";
}

export function mapWatchlist(v: string | undefined): "Clear" | "True Match" {
  const t = normalizeToken(v);
  return t === "true_match" || t === "confirmed" || t === "hit" ? "True Match" : "Clear";
}

export function deriveCaseStatus(
  sanctions: ScreenResult,
  pep: PepStatus,
  adverse: AdverseResult,
  watchlist: "Clear" | "True Match",
): ScreeningCaseStatus {
  if (sanctions === "True Match" || watchlist === "True Match" || adverse === "True Match") return "true_match";
  if (sanctions === "Potential Match" || adverse === "Potential") return "potential";
  if (pep !== "None") return "potential";
  return "clear";
}

export function slaDueAtForStatus(status: ScreeningCaseStatus, from: Date = new Date()): Date | null {
  if (status === "potential") {
    const d = new Date(from);
    d.setHours(d.getHours() + 4);
    return d;
  }
  if (status === "pending") {
    const d = new Date(from);
    d.setHours(d.getHours() + 48);
    return d;
  }
  return null;
}

export function normalizeVital4Webhook(payload: Vital4WebhookPayload): {
  vendorCaseId: string;
  status: ScreeningCaseStatus;
  snapshot: ScreeningSnapshot;
} {
  const r = payload.results ?? {};
  const sanctions = mapSanctions(r.sanctions ?? payload.status);
  const pep = mapPep(r.pep);
  const adverse = mapAdverse(r.adverse_media);
  const watchlist = mapWatchlist(r.watchlist);
  const status = deriveCaseStatus(sanctions, pep, adverse, watchlist);
  const disposition: ScreeningDisposition =
    status === "true_match" ? "true_match"
      : status === "clear" ? "clear"
        : "pending";

  return {
    vendorCaseId: payload.case_id,
    status,
    snapshot: {
      sanctions,
      pep,
      adverse,
      watchlist,
      screenedAt: payload.timestamp ?? new Date().toISOString(),
      vendorCaseId: payload.case_id,
      disposition,
    },
  };
}

/** Aggregate latest bundle — worst-case wins (non-dilution aligned). */
export function mergeSnapshots(existing: ScreeningSnapshot | null, incoming: ScreeningSnapshot): ScreeningSnapshot {
  if (!existing) return incoming;
  const rankSanctions = (s: ScreenResult) => (s === "True Match" ? 3 : s === "Potential Match" ? 2 : 1);
  const rankPep = (p: PepStatus) => (p === "Foreign" || p === "IO" ? 3 : p === "Domestic" ? 2 : 1);
  const rankAdverse = (a: AdverseResult) => (a === "True Match" ? 3 : a === "Potential" ? 2 : 1);
  const rankWatch = (w: "Clear" | "True Match") => (w === "True Match" ? 2 : 1);

  const sanctions = rankSanctions(incoming.sanctions) >= rankSanctions(existing.sanctions) ? incoming.sanctions : existing.sanctions;
  const pep = rankPep(incoming.pep) >= rankPep(existing.pep) ? incoming.pep : existing.pep;
  const adverse = rankAdverse(incoming.adverse) >= rankAdverse(existing.adverse) ? incoming.adverse : existing.adverse;
  const watchlist = rankWatch(incoming.watchlist) >= rankWatch(existing.watchlist) ? incoming.watchlist : existing.watchlist;

  return {
    sanctions,
    pep,
    adverse,
    watchlist,
    screenedAt: incoming.screenedAt,
    vendorCaseId: incoming.vendorCaseId,
    disposition: incoming.disposition,
  };
}
