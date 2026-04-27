import { downloadMediaMessage, type proto } from "@whiskeysockets/baileys";
import fs from "node:fs/promises";
import path from "node:path";
import { env } from "../config/env.js";

export const ensureMediaDir = async () => {
  const dir = path.resolve(env.MEDIA_PATH);
  await fs.mkdir(dir, { recursive: true });
  return dir;
};

export const downloadAudioMessage = async (
  msg: proto.IWebMessageInfo,
): Promise<{ filePath: string; mimeType: string } | null> => {
  const audioMsg =
    msg.message?.audioMessage ||
    msg.message?.ephemeralMessage?.message?.audioMessage ||
    msg.message?.viewOnceMessage?.message?.audioMessage;

  if (!audioMsg) return null;

  const dir = await ensureMediaDir();
  const id = msg.key.id || `audio_${Date.now()}`;
  const filePath = path.join(dir, `in_${id}.ogg`);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const buffer = (await downloadMediaMessage(msg, "buffer", {}, {} as any)) as Buffer;
  await fs.writeFile(filePath, buffer);

  return { filePath, mimeType: audioMsg.mimetype || "audio/ogg" };
};

export const extractTextContent = (msg: proto.IWebMessageInfo): string | null => {
  const m = msg.message;
  if (!m) return null;
  return (
    m.conversation ||
    m.extendedTextMessage?.text ||
    m.imageMessage?.caption ||
    m.videoMessage?.caption ||
    null
  );
};

export const isAudioMessage = (msg: proto.IWebMessageInfo): boolean => {
  const m = msg.message;
  if (!m) return false;
  return Boolean(
    m.audioMessage ||
      m.ephemeralMessage?.message?.audioMessage ||
      m.viewOnceMessage?.message?.audioMessage,
  );
};
