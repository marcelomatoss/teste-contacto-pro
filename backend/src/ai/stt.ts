import OpenAI from "openai";
import fs from "node:fs";
import { env, isSTTConfigured } from "../config/env.js";
import { logger } from "../config/logger.js";
import { timeAICall } from "../observability/metrics.js";

let openai: OpenAI | null = null;

const getClient = () => {
  if (!openai && env.STT_API_KEY) {
    openai = new OpenAI({ apiKey: env.STT_API_KEY });
  }
  return openai;
};

export const transcribeAudio = async (filePath: string): Promise<string> => {
  if (!isSTTConfigured()) {
    logger.warn("STT not configured, skipping transcription");
    return "[transcrição indisponível — STT não configurado]";
  }

  const client = getClient();
  if (!client) throw new Error("OpenAI STT client not available");

  if (!fs.existsSync(filePath)) {
    throw new Error(`Audio file not found: ${filePath}`);
  }

  return timeAICall("stt", async () => {
    const stream = fs.createReadStream(filePath);
    const transcription = await client.audio.transcriptions.create({
      file: stream,
      model: env.STT_MODEL,
      language: "pt",
      response_format: "text",
    });
    return typeof transcription === "string"
      ? transcription.trim()
      : (transcription as { text: string }).text?.trim() || "";
  });
};
