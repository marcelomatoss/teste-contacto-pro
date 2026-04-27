import dotenv from "dotenv";
import { z } from "zod";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

dotenv.config({ path: path.resolve(__dirname, "../../../.env") });
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const envSchema = z.object({
  PORT: z.coerce.number().default(3001),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  DATABASE_URL: z.string().default("file:./data/sqlite.db"),
  WHATSAPP_SESSION_PATH: z.string().default("./data/wa-session"),
  MEDIA_PATH: z.string().default("./data/media"),
  CORS_ORIGIN: z.string().default("http://localhost:5173"),
  REDIS_URL: z.string().default("redis://localhost:6379"),

  // Auth
  JWT_SECRET: z.string().min(16).default("change-me-in-production-please-use-a-real-secret"),
  JWT_TTL_HOURS: z.coerce.number().default(72),
  // Seeded on first boot if no users exist yet
  ADMIN_EMAIL: z.string().default("admin@contactpro.local"),
  ADMIN_PASSWORD: z.string().default("contactpro"),
  DEFAULT_WORKSPACE_NAME: z.string().default("Default Workspace"),
  DEFAULT_WORKSPACE_SLUG: z.string().default("default"),

  AI_PROVIDER: z.enum(["anthropic", "openai"]).default("anthropic"),
  AI_MODEL: z.string().default("claude-sonnet-4-5-20250929"),
  AI_API_KEY: z.string().optional(),

  STT_PROVIDER: z.string().default("openai"),
  STT_MODEL: z.string().default("gpt-4o-mini-transcribe"),
  STT_API_KEY: z.string().optional(),

  TTS_PROVIDER: z.string().default("openai"),
  TTS_MODEL: z.string().default("gpt-4o-mini-tts"),
  TTS_VOICE: z.string().default("alloy"),
  TTS_API_KEY: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment configuration:", parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;

export const isAIConfigured = () => Boolean(env.AI_API_KEY);
export const isSTTConfigured = () => Boolean(env.STT_API_KEY);
export const isTTSConfigured = () => Boolean(env.TTS_API_KEY);
