import OpenAI from "openai";
import fs from "node:fs/promises";
import path from "node:path";
import { env, isTTSConfigured } from "../config/env.js";
import { logger } from "../config/logger.js";

let openai: OpenAI | null = null;

const getClient = () => {
  if (!openai && env.TTS_API_KEY) {
    openai = new OpenAI({ apiKey: env.TTS_API_KEY });
  }
  return openai;
};

export interface TTSResult {
  filePath: string;
  format: "ogg" | "mp3";
}

export const synthesizeSpeech = async (
  text: string,
  outDir: string,
  filename: string,
): Promise<TTSResult | null> => {
  if (!isTTSConfigured()) {
    logger.warn("TTS not configured, skipping synthesis");
    return null;
  }

  const client = getClient();
  if (!client) return null;

  await fs.mkdir(outDir, { recursive: true });

  const filePath = path.join(outDir, `${filename}.ogg`);

  const response = await client.audio.speech.create({
    model: env.TTS_MODEL,
    voice: env.TTS_VOICE as "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer",
    input: text,
    response_format: "opus",
  });

  const buffer = Buffer.from(await response.arrayBuffer());
  await fs.writeFile(filePath, buffer);

  return { filePath, format: "ogg" };
};
