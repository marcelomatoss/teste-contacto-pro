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

const HISTORY_LIMIT = 20;

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

const findOrCreateConversation = async (jid: string, contactName: string | null) => {
  let conv = await prisma.conversation.findUnique({
    where: { whatsappJid: jid },
    include: { lead: true },
  });

  if (!conv) {
    conv = await prisma.conversation.create({
      data: {
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

const decideStatusAndReaction = (
  intent: string,
  currentStatus: string,
): { status: string; reaction: string } => {
  if (intent === "human_handoff") return { status: "needs_human", reaction: "✅" };
  if (intent === "opt_out") return { status: "opt_out", reaction: "👌" };
  if (
    intent === "contact_z" ||
    intent === "contact_tel" ||
    intent === "mailing" ||
    intent === "data_enrichment"
  ) {
    return { status: currentStatus === "new" ? "qualified" : currentStatus, reaction: "✅" };
  }
  return { status: currentStatus, reaction: "👍" };
};

export const handleInbound = async (msg: proto.IWebMessageInfo): Promise<void> => {
  const jid = msg.key.remoteJid;
  if (!jid) return;
  if (jid.endsWith("@g.us")) return; // ignorar grupos

  const contactName = msg.pushName || null;
  const conv = await findOrCreateConversation(jid, contactName);
  const audio = isAudioMessage(msg);
  const text = extractTextContent(msg);

  if (!audio && !text) {
    logger.debug({ key: msg.key }, "ignoring non-text/audio message");
    return;
  }

  // 1. Persist inbound + emit
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

  emit("wa.message.received", { message: inboundMessage, conversation: conv });

  // 2. Audio → download + transcribe
  if (audio) {
    try {
      const downloaded = await downloadAudioMessage(msg);
      if (downloaded) {
        inboundMessage = await prisma.message.update({
          where: { id: inboundMessage.id },
          data: { mediaPath: downloaded.filePath },
        });
        emit("wa.message.received", { message: inboundMessage, conversation: conv });

        const transcription = await transcribeAudio(downloaded.filePath);
        inboundMessage = await prisma.message.update({
          where: { id: inboundMessage.id },
          data: { transcription },
        });
        emit("audio.transcribed", { messageId: inboundMessage.id, transcription });
      }
    } catch (err) {
      logger.error({ err }, "audio download/transcribe failed");
      try {
        await reactToMessage(jid, msg.key, "⚠️");
      } catch {
        /* noop */
      }
    }
  }

  const userText = audio ? inboundMessage.transcription : inboundMessage.content;

  if (!userText) {
    logger.warn({ msgId: inboundMessage.id }, "no usable user text after intake");
    return;
  }

  // 3. Quick first reaction (acknowledged)
  try {
    await reactToMessage(jid, msg.key, "👍");
    await prisma.message.update({
      where: { id: inboundMessage.id },
      data: { reaction: "👍" },
    });
    emit("wa.reaction.sent", { messageId: inboundMessage.id, emoji: "👍" });
  } catch (err) {
    logger.warn({ err }, "initial reaction failed (continuing)");
  }

  // 4. AI thinking on
  emit("ai.thinking", { conversationId: conv.id, on: true });

  try {
    const history = await buildChatHistory(conv.id);
    // Remove the latest assistant turn if any to keep context clean (history already includes inbound)

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

    // 6. Decide status / final reaction
    const { status: newLeadStatus, reaction: finalReaction } = decideStatusAndReaction(
      intent,
      lead?.status || "new",
    );

    // 7. Persist intent + lead update
    const conversationStatus =
      newLeadStatus === "needs_human"
        ? "needs_human"
        : newLeadStatus === "opt_out"
          ? "opt_out"
          : "active";

    const updatedConv = await prisma.conversation.update({
      where: { id: conv.id },
      data: { intent, status: conversationStatus },
      include: { lead: true },
    });

    if (lead) {
      const merged = {
        name: qualifyResult?.name ?? lead.name,
        company: qualifyResult?.company ?? lead.company,
        phone: qualifyResult?.phone ?? lead.phone,
        serviceInterest:
          qualifyResult?.serviceInterest && qualifyResult.serviceInterest !== "unknown"
            ? qualifyResult.serviceInterest
            : lead.serviceInterest,
        leadGoal: qualifyResult?.leadGoal ?? lead.leadGoal,
        estimatedVolume: qualifyResult?.estimatedVolume ?? lead.estimatedVolume,
        status: newLeadStatus,
      };

      await prisma.lead.update({
        where: { id: lead.id },
        data: merged,
      });
    }

    const refreshedConv = await prisma.conversation.findUnique({
      where: { id: conv.id },
      include: { lead: true },
    });

    emit("lead.updated", { conversation: refreshedConv, lead: refreshedConv?.lead });
    emit("conversation.status_changed", {
      conversationId: conv.id,
      status: conversationStatus,
    });

    // 8. Generate reply text
    const replyText = await generateReply(history, {
      name: refreshedConv?.lead?.name ?? null,
      company: refreshedConv?.lead?.company ?? null,
      phone: refreshedConv?.lead?.phone ?? null,
      serviceInterest: refreshedConv?.lead?.serviceInterest ?? null,
      leadGoal: refreshedConv?.lead?.leadGoal ?? null,
      estimatedVolume: refreshedConv?.lead?.estimatedVolume ?? null,
      status: refreshedConv?.lead?.status ?? null,
      intent,
    });

    // 9. Reply (audio if inbound was audio, else text)
    let outboundRecord = await prisma.message.create({
      data: {
        conversationId: conv.id,
        direction: "outbound",
        type: audio ? "audio" : "text",
        content: replyText,
        status: "pending",
      },
    });

    let sentInfo: { whatsappId?: string | null } = {};

    if (audio) {
      const tts = await synthesizeSpeech(
        replyText,
        path.resolve(env.MEDIA_PATH),
        `out_${outboundRecord.id}`,
      );
      if (tts) {
        const buffer = await fs.readFile(tts.filePath);
        const sent = await sendAudio(jid, buffer, msg);
        outboundRecord = await prisma.message.update({
          where: { id: outboundRecord.id },
          data: {
            mediaPath: tts.filePath,
            status: "sent",
            whatsappId: sent?.key?.id || null,
          },
        });
        sentInfo = { whatsappId: sent?.key?.id };
      } else {
        // TTS not configured → fallback to text
        const sent = await sendText(jid, replyText, msg);
        outboundRecord = await prisma.message.update({
          where: { id: outboundRecord.id },
          data: {
            type: "text",
            status: "sent",
            whatsappId: sent?.key?.id || null,
          },
        });
        sentInfo = { whatsappId: sent?.key?.id };
      }
    } else {
      const sent = await sendText(jid, replyText, msg);
      outboundRecord = await prisma.message.update({
        where: { id: outboundRecord.id },
        data: {
          status: "sent",
          whatsappId: sent?.key?.id || null,
        },
      });
      sentInfo = { whatsappId: sent?.key?.id };
    }

    emit("wa.message.sent", { message: outboundRecord });

    // 10. Final reaction reflecting outcome
    if (finalReaction !== "👍") {
      try {
        await reactToMessage(jid, msg.key, finalReaction);
        await prisma.message.update({
          where: { id: inboundMessage.id },
          data: { reaction: finalReaction },
        });
        emit("wa.reaction.sent", { messageId: inboundMessage.id, emoji: finalReaction });
      } catch (err) {
        logger.warn({ err }, "final reaction failed");
      }
    }

    logger.info(
      { conv: conv.id, intent, status: conversationStatus, sent: sentInfo.whatsappId },
      "inbound handled",
    );
  } catch (err) {
    logger.error({ err }, "pipeline error");
    emit("error", { message: "Falha ao processar mensagem", conversationId: conv.id });
    try {
      await reactToMessage(jid, msg.key, "⚠️");
    } catch {
      /* noop */
    }
  } finally {
    emit("ai.thinking", { conversationId: conv.id, on: false });
  }
};
