import { Kafka, logLevel } from "kafkajs";
import type { FeedEvent } from "../../src/pipeline/feeds";
import type { FeedQueue } from "./types";

export function createKafkaQueue(): FeedQueue {
  const brokers = (process.env.KAFKA_BROKERS ?? "localhost:9092").split(",");
  const topic = process.env.KAFKA_FEED_TOPIC ?? "cram.feed.events";
  const groupId = process.env.KAFKA_GROUP_ID ?? "cram-feed-worker";

  const kafka = new Kafka({ clientId: "cram-api", brokers, logLevel: logLevel.ERROR });
  const producer = kafka.producer();
  const consumer = kafka.consumer({ groupId });
  let started = false;

  return {
    driver: "kafka",
    async publish(event: FeedEvent) {
      if (!started) { await producer.connect(); started = true; }
      await producer.send({
        topic,
        messages: [{ key: event.id, value: JSON.stringify(event) }],
      });
    },
    async startWorker(handler) {
      await consumer.connect();
      await consumer.subscribe({ topic, fromBeginning: false });
      await consumer.run({
        eachMessage: async ({ message }) => {
          if (!message.value) return;
          await handler(JSON.parse(message.value.toString()) as FeedEvent);
        },
      });
    },
    async stopWorker() {
      await consumer.disconnect();
      await producer.disconnect();
      started = false;
    },
    async stats() {
      return { pending: -1, processing: -1, done: -1, deadLetter: -1 };
    },
  };
}
