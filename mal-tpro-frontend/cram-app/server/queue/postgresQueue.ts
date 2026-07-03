import { prisma } from "../db/client";
import type { FeedEvent } from "../../src/pipeline/feeds";
import type { FeedQueue } from "./types";

const POLL_MS = 500;
const MAX_ATTEMPTS = 5;

export function createPostgresQueue(): FeedQueue {
  let timer: ReturnType<typeof setInterval> | null = null;
  let handler: ((e: FeedEvent) => Promise<void>) | null = null;
  let processing = false;

  async function poll() {
    if (!handler || processing) return;
    processing = true;
    try {
      const msg = await prisma.$transaction(async (tx) => {
        const row = await tx.feedQueueMessage.findFirst({
          where: { status: "pending" },
          orderBy: { createdAt: "asc" },
        });
        if (!row) return null;
        return tx.feedQueueMessage.update({
          where: { id: row.id },
          data: { status: "processing", attempts: { increment: 1 } },
        });
      });
      if (!msg) return;
      const event = msg.payload as unknown as FeedEvent;
      try {
        await handler(event);
        await prisma.feedQueueMessage.update({
          where: { id: msg.id },
          data: { status: "done", processedAt: new Date() },
        });
      } catch (err) {
        const attempts = msg.attempts + 1;
        await prisma.feedQueueMessage.update({
          where: { id: msg.id },
          data: {
            status: attempts >= MAX_ATTEMPTS ? "dead_letter" : "pending",
            lastError: String(err),
          },
        });
      }
    } finally {
      processing = false;
    }
  }

  return {
    driver: "postgres",
    async publish(event: FeedEvent) {
      await prisma.feedQueueMessage.upsert({
        where: { eventId: event.id },
        create: { eventId: event.id, payload: event as object, status: "pending" },
        update: {}, // idempotent — already queued
      });
    },
    async startWorker(h) {
      handler = h;
      if (!timer) timer = setInterval(() => void poll(), POLL_MS);
    },
    async stopWorker() {
      if (timer) { clearInterval(timer); timer = null; }
      handler = null;
    },
    async stats() {
      const groups = await prisma.feedQueueMessage.groupBy({ by: ["status"], _count: true });
      const m = Object.fromEntries(groups.map((g) => [g.status, g._count]));
      return {
        pending: m.pending ?? 0, processing: m.processing ?? 0,
        done: m.done ?? 0, deadLetter: m.dead_letter ?? 0,
      };
    },
  };
}
