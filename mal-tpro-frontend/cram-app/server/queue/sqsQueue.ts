import {
  SQSClient, SendMessageCommand, ReceiveMessageCommand,
  DeleteMessageCommand, ChangeMessageVisibilityCommand,
} from "@aws-sdk/client-sqs";
import type { FeedEvent } from "../../src/pipeline/feeds";
import type { FeedQueue } from "./types";

export function createSqsQueue(): FeedQueue {
  const url = process.env.SQS_FEED_QUEUE_URL;
  if (!url) throw new Error("SQS_FEED_QUEUE_URL required for QUEUE_DRIVER=sqs");

  const client = new SQSClient({ region: process.env.AWS_REGION ?? "me-central-1" });
  let timer: ReturnType<typeof setInterval> | null = null;
  let handler: ((e: FeedEvent) => Promise<void>) | null = null;

  return {
    driver: "sqs",
    async publish(event: FeedEvent) {
      await client.send(new SendMessageCommand({
        QueueUrl: url,
        MessageBody: JSON.stringify(event),
        MessageDeduplicationId: event.id,
        MessageGroupId: event.source,
      }));
    },
    async startWorker(h) {
      handler = h;
      if (timer) return;
      timer = setInterval(async () => {
        if (!handler) return;
        const res = await client.send(new ReceiveMessageCommand({
          QueueUrl: url, MaxNumberOfMessages: 5, WaitTimeSeconds: 1,
          MessageAttributeNames: ["All"],
        }));
        for (const msg of res.Messages ?? []) {
          if (!msg.Body || !msg.ReceiptHandle) continue;
          try {
            await handler(JSON.parse(msg.Body) as FeedEvent);
            await client.send(new DeleteMessageCommand({ QueueUrl: url, ReceiptHandle: msg.ReceiptHandle }));
          } catch {
            await client.send(new ChangeMessageVisibilityCommand({
              QueueUrl: url, ReceiptHandle: msg.ReceiptHandle, VisibilityTimeout: 30,
            }));
          }
        }
      }, 1000);
    },
    async stopWorker() {
      if (timer) { clearInterval(timer); timer = null; }
      handler = null;
    },
    async stats() {
      // SQS depth requires GetQueueAttributes — return placeholder counts
      return { pending: -1, processing: -1, done: -1, deadLetter: -1 };
    },
  };
}
