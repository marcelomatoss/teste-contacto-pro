import { Queue, Worker, type Job } from "bullmq";
import { getRedis } from "./connection.js";
import { INBOUND_QUEUE_NAME, type InboundJobPayload } from "./types.js";
import { logger } from "../config/logger.js";

let queue: Queue<InboundJobPayload> | null = null;

export const getInboundQueue = (): Queue<InboundJobPayload> => {
  if (!queue) {
    queue = new Queue<InboundJobPayload>(INBOUND_QUEUE_NAME, {
      connection: getRedis(),
      defaultJobOptions: {
        attempts: 4,
        backoff: { type: "exponential", delay: 800 },
        removeOnComplete: { count: 200, age: 3600 },
        removeOnFail: { count: 100, age: 86400 },
      },
    });
  }
  return queue;
};

/**
 * Enqueue an inbound WhatsApp message for processing.
 *
 * Idempotency:  jobId is derived from JID + WhatsApp message ID. BullMQ will
 * silently drop duplicate jobIds, so re-deliveries from Baileys (e.g. on
 * reconnect or when reading offline messages) never trigger the pipeline twice.
 */
export const enqueueInbound = async (payload: InboundJobPayload): Promise<void> => {
  const q = getInboundQueue();
  const jobId = `${payload.jid}_${payload.whatsappMessageId}`;
  await q.add("process", payload, { jobId });
  logger.debug({ jobId }, "inbound enqueued");
};

export type InboundProcessor = (payload: InboundJobPayload, job: Job<InboundJobPayload>) => Promise<void>;

let worker: Worker<InboundJobPayload> | null = null;

export const startInboundWorker = (processor: InboundProcessor): Worker<InboundJobPayload> => {
  if (worker) return worker;
  worker = new Worker<InboundJobPayload>(
    INBOUND_QUEUE_NAME,
    async (job) => {
      const start = Date.now();
      logger.debug({ jobId: job.id, attempt: job.attemptsMade + 1 }, "processing inbound job");
      await processor(job.data, job);
      logger.info(
        { jobId: job.id, duration: Date.now() - start, attempt: job.attemptsMade + 1 },
        "inbound job done",
      );
    },
    {
      connection: getRedis(),
      concurrency: 4,
      lockDuration: 60_000,
    },
  );

  worker.on("failed", (job, err) => {
    logger.error(
      { jobId: job?.id, err: err.message, attempt: job?.attemptsMade },
      "inbound job failed",
    );
  });

  worker.on("error", (err) => {
    logger.error({ err: err.message }, "worker error");
  });

  return worker;
};

export const stopInboundWorker = async () => {
  if (worker) {
    await worker.close();
    worker = null;
  }
  if (queue) {
    await queue.close();
    queue = null;
  }
};
