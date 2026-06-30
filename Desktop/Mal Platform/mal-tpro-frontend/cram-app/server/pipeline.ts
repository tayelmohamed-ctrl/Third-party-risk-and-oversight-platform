import type { FeedEvent, FeedSource } from "../src/pipeline/feeds";
import { processEvent, type ProcessedEvent } from "../src/pipeline/triggerEngine";
import { ratingDelta, type Assessment } from "../src/engine/rerating";
import {
  appendFeedEvent, appendMlroAlert, processedIds, pgStore,
} from "./db/auditStore";
import { resolveVendorIdentity } from "./identity/resolver";

/** Vendor webhook payload — customerId OR vendorSubjectId required. */
export interface InboundFeedEvent {
  id: string;
  source: FeedSource;
  kind: FeedEvent["kind"];
  customerId?: string;
  vendorSubjectId?: string;
  customerName?: string;
  at: string;
  severity?: FeedEvent["severity"];
  payload: FeedEvent["payload"];
  headline: string;
}

export async function resolveInboundEvent(raw: InboundFeedEvent): Promise<
  { event: FeedEvent } | { error: string; deadLetter: true }
> {
  if (raw.customerId) {
    return {
      event: {
        id: raw.id, source: raw.source, kind: raw.kind,
        customerId: raw.customerId, customerName: raw.customerName,
        at: raw.at, severity: raw.severity, payload: raw.payload, headline: raw.headline,
      },
    };
  }
  if (raw.vendorSubjectId) {
    const resolved = await resolveVendorIdentity(raw.vendorSubjectId, raw.source);
    if ("reason" in resolved) {
      return { error: resolved.reason, deadLetter: true };
    }
    return {
      event: {
        id: raw.id, source: raw.source, kind: raw.kind,
        customerId: resolved.customerId,
        customerName: raw.customerName ?? resolved.customerName,
        at: raw.at, severity: raw.severity, payload: raw.payload, headline: raw.headline,
      },
    };
  }
  return { error: "customerId or vendorSubjectId required", deadLetter: true };
}

/** Process one feed event synchronously against loaded store, persist async. */
export async function ingestFeedEvent(e: FeedEvent): Promise<ProcessedEvent> {
  const seen = await processedIds();
  const latestList = await pgStore.latestByCustomer();
  let pending: Assessment | null = null;

  const memoryStore = {
    latestByCustomer: () => latestList,
    addAssessment(a: Assessment) {
      pending = a;
      const idx = latestList.findIndex((x) => x.customerId === a.customerId);
      if (idx >= 0) latestList[idx] = a;
      else latestList.push(a);
    },
  };

  const result = processEvent(e, seen, memoryStore);
  if (pending) await pgStore.addAssessment(pending);
  await appendFeedEvent(result);

  if (result.outcome === "re-rated" && result.prevRating && result.newRating) {
    if (ratingDelta(result.prevRating, result.newRating) === "up") {
      await appendMlroAlert({
        customerId: result.customerId,
        customerName: result.customerName ?? result.customerId,
        prevRating: result.prevRating, newRating: result.newRating,
        trigger: result.kind, headline: result.headline, source: result.source,
      });
    }
  }

  return result;
}

export async function ingestInboundEvent(raw: InboundFeedEvent): Promise<ProcessedEvent | { error: string; deadLetter: true }> {
  const resolved = await resolveInboundEvent(raw);
  if ("error" in resolved) return resolved;
  return ingestFeedEvent(resolved.event);
}
