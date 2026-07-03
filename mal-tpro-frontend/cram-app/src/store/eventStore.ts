// Feed event log — persisted in the server immutable audit store.
import type { ProcessedEvent } from "../pipeline/triggerEngine";
import { apiAllEvents, apiIngestEvent } from "../lib/api";
import type { FeedEvent } from "../pipeline/feeds";

export async function recordEvent(e: ProcessedEvent) {
  // Events are recorded server-side during ingest; this is a no-op for API path.
  void e;
}

export async function ingestEvent(e: FeedEvent): Promise<ProcessedEvent> {
  return apiIngestEvent(e);
}

export async function allEvents(): Promise<ProcessedEvent[]> {
  return apiAllEvents();
}

export async function processedIds(): Promise<Set<string>> {
  const events = await apiAllEvents();
  return new Set(events.map((ev) => ev.id));
}

export async function resetEvents() {
  console.warn("resetEvents: immutable audit store cannot be cleared from the browser");
}
