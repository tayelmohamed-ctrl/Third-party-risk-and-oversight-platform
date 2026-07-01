// Mal FinCrime OS — trigger pipeline core. Turns an inbound FeedEvent into an
// automatic, governed re-rating: resolve customer → apply rules/thresholds →
// dedupe → re-rate → append to the immutable timeline.
import type { FeedEvent } from "./feeds";
import { KIND_TO_TRIGGER } from "./feeds";
import { reRate, type Assessment } from "../engine/rerating";

export interface PipelineStore {
  latestByCustomer(): Assessment[];
  addAssessment(a: Assessment): void;
}

export type PipelineOutcome = "re-rated" | "no-change" | "below-threshold" | "no-match" | "duplicate";

export interface ProcessedEvent extends FeedEvent {
  outcome: PipelineOutcome;
  detail: string;
  prevRating?: string;
  newRating?: string;
}

// Rules layer: does this event warrant a re-rating? (thresholds keep noise out)
function warrants(e: FeedEvent): { ok: boolean; reason?: string } {
  if (e.kind === "adverse_media") {
    const c = Number(e.payload.confidence ?? 0);
    return c >= 0.5 ? { ok: true } : { ok: false, reason: `confidence ${(c * 100).toFixed(0)}% < 50% action threshold` };
  }
  if (e.kind === "transaction_alert") {
    return e.severity === "high" || e.severity === "critical"
      ? { ok: true }
      : { ok: false, reason: `severity ${e.severity ?? "low"} below action threshold` };
  }
  // sanctions list match, SAR filed, ownership change, PEP change → always act
  return { ok: true };
}

/**
 * Process one event. `seen` is the set of already-processed event ids (idempotency).
 * Pure w.r.t. inputs except it appends an assessment when a re-rating occurs.
 */
export function processEvent(e: FeedEvent, seen: Set<string>, store: PipelineStore): ProcessedEvent {
  if (seen.has(e.id)) return { ...e, outcome: "duplicate", detail: "already processed (idempotent)" };

  const latest = store.latestByCustomer().find((a) => a.customerId === e.customerId);
  if (!latest) return { ...e, outcome: "no-match", detail: "customer not under assessment" };

  const w = warrants(e);
  if (!w.ok) return { ...e, outcome: "below-threshold", detail: w.reason ?? "below threshold" };

  const trigger = KIND_TO_TRIGGER[e.kind];
  const outcome = reRate(latest, trigger, e.headline, `feed:${e.source}`);
  if (!outcome.ok) {
    return { ...e, outcome: "below-threshold", detail: `DQ blocked: ${outcome.verdict.summary}` };
  }
  const next = outcome.assessment;
  store.addAssessment(next);

  const changed = next.rating !== latest.rating;
  return {
    ...e,
    outcome: changed ? "re-rated" : "no-change",
    detail: `${latest.rating} → ${next.rating}${next.overrides[0] ? ` (${next.overrides[0].id})` : ""}`,
    prevRating: latest.rating,
    newRating: next.rating,
  };
}
