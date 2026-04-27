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
 *
 * This thin wrapper exists so message ingest stays fast and decoupled from
 * the heavy Anthropic/Whisper/TTS calls — the worker handles those out of band.
 */
export const handleInbound = async (msg: proto.IWebMessageInfo): Promise<void> => {
  const jid = msg.key.remoteJid;
  if (!jid) return;
  const whatsappMessageId = msg.key.id;
  if (!whatsappMessageId) return;

  if (isRedisAvailable()) {
    try {
      await enqueueInbound({
        jid,
        whatsappMessageId,
        pushName: msg.pushName ?? null,
        rawMessage: msg as unknown,
      });
      return;
    } catch (err) {
      logger.warn({ err }, "enqueue failed, falling back to inline processing");
    }
  }

  // Degraded mode — Redis unavailable. Process inline and absorb the cost.
  await processInbound(msg);
};
