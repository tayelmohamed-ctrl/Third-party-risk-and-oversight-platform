import type { FeedEvent } from "../../src/pipeline/feeds";

export interface QueuedFeedEvent {
  eventId: string;
  payload: FeedEvent;
  enqueuedAt: string;
}

export interface FeedQueue {
  readonly driver: string;
  publish(event: FeedEvent): Promise<void>;
  startWorker(handler: (event: FeedEvent) => Promise<void>): Promise<void>;
  stopWorker(): Promise<void>;
  stats(): Promise<{ pending: number; processing: number; done: number; deadLetter: number }>;
}
