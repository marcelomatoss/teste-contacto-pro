import type { proto } from "@whiskeysockets/baileys";
import { logger } from "../config/logger.js";
import { enqueueInbound } from "../queue/inboundQueue.js";
import { isRedisAvailable } from "../queue/connection.js";
import { processInbound } from "./processInbound.js";

/**
 * Entry point fired by Baileys for every inbound message. We:
 *
 *   1. Try to enqueue the message into BullMQ (idempotent via jobId).
 *   2. If Redis is not available (degraded mode), fall back to running the
 *      pipeline inline so the bot still works without infra.
 */
export const handleInbound = async (
  workspaceId: string,
  msg: proto.IWebMessageInfo,
): Promise<void> => {
  const jid = msg.key.remoteJid;
  if (!jid) return;
  const whatsappMessageId = msg.key.id;
  if (!whatsappMessageId) return;

  if (isRedisAvailable()) {
    try {
      await enqueueInbound({
        workspaceId,
        jid,
        whatsappMessageId,
        pushName: msg.pushName ?? null,
        rawMessage: msg as unknown,
      });
      return;
    } catch (err) {
      logger.warn({ err, workspaceId }, "enqueue failed, falling back to inline processing");
    }
  }

  await processInbound(workspaceId, msg);
};
