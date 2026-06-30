import type { FeedQueue } from "./types";
import { createPostgresQueue } from "./postgresQueue";
import { createSqsQueue } from "./sqsQueue";
import { createKafkaQueue } from "./kafkaQueue";

let queue: FeedQueue | null = null;

export function getFeedQueue(): FeedQueue {
  if (queue) return queue;
  const driver = process.env.QUEUE_DRIVER ?? "postgres";
  switch (driver) {
    case "sqs": queue = createSqsQueue(); break;
    case "kafka": queue = createKafkaQueue(); break;
    case "postgres":
    default: queue = createPostgresQueue(); break;
  }
  return queue;
}

export async function startQueueWorker(handler: (event: import("../../src/pipeline/feeds").FeedEvent) => Promise<void>) {
  const q = getFeedQueue();
  await q.startWorker(handler);
  return q;
}
