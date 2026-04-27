/**
 * Job payload that travels through the queue.
 *
 * Idempotency: the BullMQ jobId is `${workspaceId}_${jid}_${whatsappMessageId}`,
 * so the same inbound message can be enqueued any number of times and will
 * only run once (per tenant — different workspaces have independent queues
 * of identity).
 */
export interface InboundJobPayload {
  workspaceId: string;
  jid: string;
  whatsappMessageId: string;
  pushName: string | null;
  rawMessage: unknown;
}

export const INBOUND_QUEUE_NAME = "wa-inbound";
