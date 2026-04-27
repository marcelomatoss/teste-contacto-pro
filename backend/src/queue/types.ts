/**
 * Job payload that travels through the queue.
 *
 * We store the entire WhatsApp WAMessage as JSON so the worker can decide
 * what to do with it (text, audio, etc) without re-fetching from the network.
 *
 * Idempotency: the BullMQ jobId is `${jid}_${whatsappMessageId}`, so the same
 * inbound message can be enqueued any number of times and will only run once.
 */
export interface InboundJobPayload {
  jid: string;
  whatsappMessageId: string;
  pushName: string | null;
  // Serialized WAMessage (proto.IWebMessageInfo) — re-hydrated by the worker.
  // Stored as `unknown` because the proto types are heavy and we never
  // introspect them at the queue boundary; the worker imports the same
  // type from Baileys at consumption time.
  rawMessage: unknown;
}

export const INBOUND_QUEUE_NAME = "wa-inbound";
