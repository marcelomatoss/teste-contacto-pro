import type { proto } from "@whiskeysockets/baileys";
import fs from "node:fs/promises";
import path from "node:path";
import { prisma } from "../db/client.js";
import { logger } from "../config/logger.js";
import { env } from "../config/env.js";
import { emit } from "../realtime/socket.js";
import {
  reactToMessage,
  sendAudio,
  sendText,
} from "../whatsapp/client.js";
import {
  downloadAudioMessage,
  extractTextContent,
  isAudioMessage,
} from "../whatsapp/media.js";
import { transcribeAudio } from "../ai/stt.js";
import { synthesizeSpeech } from "../ai/tts.js";
import { generateReply, type ChatMessage, type LeadSnapshot } from "../ai/llm.js";
import { classifyIntent } from "../ai/intent.js";
import { qualifyLead } from "../ai/qualify.js";
import { decideStatusAndReaction } from "./decideStatus.js";
import {
  intentClassified,
  leadStatusTransition,
  waMessages,
  waReactions,
} from "../observability/metrics.js";

const HISTORY_LIMIT = 20;

// ─── Helpers (kept small + pure where possible for readability) ─────────

const buildChatHistory = async (conversationId: string): Promise<ChatMessage[]> => {
  const msgs = await prisma.message.findMany({
    where: {
      conversationId,
      OR: [{ type: "text" }, { type: "audio", transcription: { not: null } }],
    },
    orderBy: { createdAt: "desc" },
    take: HISTORY_LIMIT,
  });

  return msgs
    .reverse()
    .map<ChatMessage>((m) => ({
      role: m.direction === "inbound" ? "user" : "assistant",
      content: (m.type === "audio" ? m.transcription : m.content) || "",
    }))
    .filter((m) => m.content.length > 0);
};

const findOrCreateConversation = async (
  workspaceId: string,
  jid: string,
  contactName: string | null,
) => {
  let conv = await prisma.conversation.findUnique({
    where: { workspaceId_whatsappJid: { workspaceId, whatsappJid: jid } },
    include: { lead: true },
  });
  if (!conv) {
    conv = await prisma.conversation.create({
      data: {
        workspaceId,
        whatsappJid: jid,
        contactName: contactName ?? null,
        lead: { create: { phone: jid.split("@")[0] || null } },
      },
      include: { lead: true },
    });
  } else if (contactName && conv.contactName !== contactName) {
    conv = await prisma.conversation.update({
      where: { id: conv.id },
      data: { contactName },
      include: { lead: true },
    });
  }
  return conv;
};

interface IngestResult {
  inboundMessage: Awaited<ReturnType<typeof prisma.message.create>>;
  userText: string | null;
}

/**
 * Persist the inbound message and, when it's audio, download + transcribe.
 * Emits realtime events as each stage completes.
 */
const ingestInbound = async (
  workspaceId: string,
  msg: proto.IWebMessageInfo,
  conv: Awaited<ReturnType<typeof findOrCreateConversation>>,
  audio: boolean,
  text: string | null,
  jid: string,
): Promise<IngestResult> => {
  let inboundMessage = await prisma.message.create({
    data: {
      conversationId: conv.id,
      whatsappId: msg.key.id || null,
      direction: "inbound",
      type: audio ? "audio" : "text",
      content: text,
      status: "delivered",
    },
  });
  waMessages.inc({ direction: "inbound", type: audio ? "audio" : "text" });
  emit("wa.message.received", { message: inboundMessage, conversation: conv }, workspaceId);

  if (!audio) {
    return { inboundMessage, userText: inboundMessage.content };
  }

  try {
    const downloaded = await downloadAudioMessage(msg);
    if (!downloaded) return { inboundMessage, userText: null };

    inboundMessage = await prisma.message.update({
      where: { id: inboundMessage.id },
      data: { mediaPath: downloaded.filePath },
    });
    emit("wa.message.received", { message: inboundMessage, conversation: conv }, workspaceId);

    const transcription = await transcribeAudio(downloaded.filePath);
    inboundMessage = await prisma.message.update({
      where: { id: inboundMessage.id },
      data: { transcription },
    });
    emit("audio.transcribed", { messageId: inboundMessage.id, transcription }, workspaceId);
    return { inboundMessage, userText: transcription };
  } catch (err) {
    logger.error({ err, workspaceId }, "audio download/transcribe failed");
    try {
      await reactToMessage(workspaceId, jid, msg.key, "⚠️");
    } catch {
      /* noop */
    }
    return { inboundMessage, userText: null };
  }
};

const applyInitialReaction = async (
  workspaceId: string,
  jid: string,
  msg: proto.IWebMessageInfo,
  inboundMessageId: string,
) => {
  try {
    await reactToMessage(workspaceId, jid, msg.key, "👍");
    await prisma.message.update({
      where: { id: inboundMessageId },
      data: { reaction: "👍" },
    });
    waReactions.inc({ emoji: "👍" });
    emit("wa.reaction.sent", { messageId: inboundMessageId, emoji: "👍" }, workspaceId);
  } catch (err) {
    logger.warn({ err }, "initial reaction failed (continuing)");
  }
};

const applyFinalReaction = async (
  workspaceId: string,
  jid: string,
  msg: proto.IWebMessageInfo,
  inboundMessageId: string,
  reaction: "👍" | "✅" | "👌" | "⚠️",
) => {
  if (reaction === "👍") return;
  try {
    await reactToMessage(workspaceId, jid, msg.key, reaction);
    await prisma.message.update({
      where: { id: inboundMessageId },
      data: { reaction },
    });
    waReactions.inc({ emoji: reaction });
    emit("wa.reaction.sent", { messageId: inboundMessageId, emoji: reaction }, workspaceId);
  } catch (err) {
    logger.warn({ err }, "final reaction failed");
  }
};

const persistDecision = async (
  workspaceId: string,
  conv: Awaited<ReturnType<typeof findOrCreateConversation>>,
  intent: string,
  decision: ReturnType<typeof decideStatusAndReaction>,
  qualifyResult: Awaited<ReturnType<typeof qualifyLead>>,
) => {
  const previousStatus = conv.lead?.status || "new";
  if (conv.lead && previousStatus !== decision.leadStatus) {
    leadStatusTransition.inc({ from: previousStatus, to: decision.leadStatus });
  }

  await prisma.conversation.update({
    where: { id: conv.id },
    data: { intent, status: decision.conversationStatus },
  });

  if (conv.lead) {
    await prisma.lead.update({
      where: { id: conv.lead.id },
      data: {
        name: qualifyResult?.name ?? conv.lead.name,
        company: qualifyResult?.company ?? conv.lead.company,
        phone: qualifyResult?.phone ?? conv.lead.phone,
        serviceInterest:
          qualifyResult?.serviceInterest && qualifyResult.serviceInterest !== "unknown"
            ? qualifyResult.serviceInterest
            : conv.lead.serviceInterest,
        leadGoal: qualifyResult?.leadGoal ?? conv.lead.leadGoal,
        estimatedVolume: qualifyResult?.estimatedVolume ?? conv.lead.estimatedVolume,
        status: decision.leadStatus,
      },
    });
  }

  const refreshed = await prisma.conversation.findUnique({
    where: { id: conv.id },
    include: { lead: true },
  });
  emit("lead.updated", { conversation: refreshed, lead: refreshed?.lead }, workspaceId);
  emit(
    "conversation.status_changed",
    { conversationId: conv.id, status: decision.conversationStatus },
    workspaceId,
  );
  return refreshed;
};

const sendBotReply = async (
  workspaceId: string,
  jid: string,
  msg: proto.IWebMessageInfo,
  conversationId: string,
  replyText: string,
  inboundWasAudio: boolean,
) => {
  let outbound = await prisma.message.create({
    data: {
      conversationId,
      direction: "outbound",
      type: inboundWasAudio ? "audio" : "text",
      content: replyText,
      status: "pending",
    },
  });

  if (inboundWasAudio) {
    const tts = await synthesizeSpeech(
      replyText,
      path.resolve(env.MEDIA_PATH),
      `out_${outbound.id}`,
    );
    if (tts) {
      const buffer = await fs.readFile(tts.filePath);
      const sent = await sendAudio(workspaceId, jid, buffer, msg);
      outbound = await prisma.message.update({
        where: { id: outbound.id },
        data: {
          mediaPath: tts.filePath,
          status: "sent",
          whatsappId: sent?.key?.id || null,
        },
      });
    } else {
      // No TTS configured — degrade to text
      const sent = await sendText(workspaceId, jid, replyText, msg);
      outbound = await prisma.message.update({
        where: { id: outbound.id },
        data: {
          type: "text",
          status: "sent",
          whatsappId: sent?.key?.id || null,
        },
      });
    }
  } else {
    const sent = await sendText(workspaceId, jid, replyText, msg);
    outbound = await prisma.message.update({
      where: { id: outbound.id },
      data: {
        status: "sent",
        whatsappId: sent?.key?.id || null,
      },
    });
  }

  waMessages.inc({ direction: "outbound", type: outbound.type });
  emit("wa.message.sent", { message: outbound }, workspaceId);
  return outbound;
};

// ─── Main pipeline ──────────────────────────────────────────────────────

/**
 * Inbound message pipeline. Workspace-scoped end-to-end. BullMQ retries this
 * whole function on failure with exponential backoff, so any throw will be
 * retried up to 4 times.
 */
export const processInbound = async (
  workspaceId: string,
  msg: proto.IWebMessageInfo,
): Promise<void> => {
  const jid = msg.key.remoteJid;
  if (!jid || jid.endsWith("@g.us")) return;

  const audio = isAudioMessage(msg);
  const text = extractTextContent(msg);
  if (!audio && !text) {
    logger.debug({ key: msg.key }, "ignoring non-text/audio message");
    return;
  }

  const conv = await findOrCreateConversation(workspaceId, jid, msg.pushName ?? null);

  // 1-2. Ingest + (if audio) transcribe
  const { inboundMessage, userText } = await ingestInbound(
    workspaceId,
    msg,
    conv,
    audio,
    text,
    jid,
  );
  if (!userText) {
    logger.warn({ msgId: inboundMessage.id, workspaceId }, "no usable user text after intake");
    return;
  }

  // 3. Quick first reaction
  await applyInitialReaction(workspaceId, jid, msg, inboundMessage.id);

  // 4. AI thinking on
  emit("ai.thinking", { conversationId: conv.id, on: true }, workspaceId);

  try {
    const history = await buildChatHistory(conv.id);
    const lead = conv.lead;
    const leadSnapshot: LeadSnapshot = {
      name: lead?.name ?? null,
      company: lead?.company ?? null,
      phone: lead?.phone ?? null,
      serviceInterest: lead?.serviceInterest ?? null,
      leadGoal: lead?.leadGoal ?? null,
      estimatedVolume: lead?.estimatedVolume ?? null,
      status: lead?.status ?? null,
      intent: conv.intent ?? null,
    };

    // 5. Classify + qualify in parallel
    const [intent, qualifyResult] = await Promise.all([
      classifyIntent(history, userText),
      qualifyLead(history, userText, leadSnapshot),
    ]);
    intentClassified.inc({ intent });

    // 6-7. Status decision + persist
    const decision = decideStatusAndReaction(intent, lead?.status || "new");
    const refreshed = await persistDecision(workspaceId, conv, intent, decision, qualifyResult);

    // 8. Generate reply
    const replyText = await generateReply(history, {
      name: refreshed?.lead?.name ?? null,
      company: refreshed?.lead?.company ?? null,
      phone: refreshed?.lead?.phone ?? null,
      serviceInterest: refreshed?.lead?.serviceInterest ?? null,
      leadGoal: refreshed?.lead?.leadGoal ?? null,
      estimatedVolume: refreshed?.lead?.estimatedVolume ?? null,
      status: refreshed?.lead?.status ?? null,
      intent,
    });

    // 9. Reply (audio-in → audio-out, text-in → text-out)
    await sendBotReply(workspaceId, jid, msg, conv.id, replyText, audio);

    // 10. Final reaction (✅ / 👌)
    await applyFinalReaction(workspaceId, jid, msg, inboundMessage.id, decision.reaction);

    logger.info(
      { conv: conv.id, intent, status: decision.conversationStatus, workspaceId },
      "inbound processed",
    );
  } catch (err) {
    logger.error({ err, workspaceId }, "pipeline error");
    emit("error", { message: "Falha ao processar mensagem", conversationId: conv.id }, workspaceId);
    try {
      await reactToMessage(workspaceId, jid, msg.key, "⚠️");
    } catch {
      /* noop */
    }
    throw err;
  } finally {
    emit("ai.thinking", { conversationId: conv.id, on: false }, workspaceId);
  }
};
