import OpenAI from "openai";
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { env } from "../config/env.js";
import { logger } from "../config/logger.js";
import { CONTACT_PRO_KNOWLEDGE_BASE } from "../knowledge/contactpro.js";

const EMBED_MODEL = "text-embedding-3-small";
const EMBED_DIMS = 1536;

interface Chunk {
  id: string;
  title: string;
  content: string;
}

interface EmbeddedChunk extends Chunk {
  embedding: number[];
}

interface RAGCache {
  model: string;
  hash: string;
  chunks: EmbeddedChunk[];
}

let memo: { hash: string; chunks: EmbeddedChunk[] } | null = null;
let openai: OpenAI | null = null;

const getClient = (): OpenAI | null => {
  // Reuse the STT key if present (same provider) — most setups configure
  // OpenAI once and use it for embeddings + STT + TTS.
  const key = env.STT_API_KEY || env.TTS_API_KEY;
  if (!key) return null;
  if (!openai) openai = new OpenAI({ apiKey: key });
  return openai;
};

/**
 * Splits the KB markdown into semantic chunks.
 * Each '### ' heading becomes its own chunk; the intro and behaviour
 * sections become an additional 'persona' chunk.
 */
export const chunkKnowledgeBase = (kb: string): Chunk[] => {
  const lines = kb.split("\n");
  const chunks: Chunk[] = [];
  let current: { title: string; lines: string[] } | null = null;

  const flush = () => {
    if (current && current.lines.join("\n").trim().length > 0) {
      const id = crypto
        .createHash("sha1")
        .update(current.title + current.lines.join("\n"))
        .digest("hex")
        .slice(0, 12);
      chunks.push({
        id,
        title: current.title,
        content: `${current.title}\n${current.lines.join("\n").trim()}`,
      });
    }
    current = null;
  };

  for (const line of lines) {
    if (line.startsWith("### ")) {
      flush();
      current = { title: line.replace(/^###\s+/, "").trim(), lines: [] };
    } else if (line.startsWith("## ") && current) {
      // top-level section change — close previous chunk
      flush();
      current = { title: line.replace(/^##\s+/, "").trim(), lines: [] };
    } else if (current) {
      current.lines.push(line);
    } else {
      // pre-amble (before first heading) — collect into a persona chunk
      if (chunks.length === 0) {
        if (!current) current = { title: "Visão geral Contact Pro", lines: [] };
        current.lines.push(line);
      }
    }
  }
  flush();

  return chunks.filter((c) => c.content.length > 50);
};

const hashChunks = (chunks: Chunk[]): string =>
  crypto
    .createHash("sha256")
    .update(JSON.stringify(chunks.map((c) => ({ id: c.id, content: c.content }))))
    .digest("hex");

const cachePath = (): string =>
  path.resolve(path.dirname(env.MEDIA_PATH || "./data/media"), "rag-cache.json");

const loadCache = async (): Promise<RAGCache | null> => {
  try {
    const raw = await fs.readFile(cachePath(), "utf-8");
    return JSON.parse(raw) as RAGCache;
  } catch {
    return null;
  }
};

const saveCache = async (cache: RAGCache) => {
  await fs.mkdir(path.dirname(cachePath()), { recursive: true });
  await fs.writeFile(cachePath(), JSON.stringify(cache));
};

const embedTexts = async (texts: string[]): Promise<number[][]> => {
  const client = getClient();
  if (!client) {
    // Deterministic fallback embedding so the system still works in offline
    // tests / when no key is set. NOT semantic — just stable so downstream
    // logic exercises the retrieval path.
    return texts.map((t) => deterministicEmbedding(t));
  }
  const resp = await client.embeddings.create({
    model: EMBED_MODEL,
    input: texts,
  });
  return resp.data.map((d) => d.embedding);
};

/**
 * Tiny deterministic pseudo-embedding for tests / offline mode.
 * Hashes the text and seeds a 1536-d vector. Has no semantic meaning,
 * but cosine similarity is well-defined and stable.
 */
const deterministicEmbedding = (text: string): number[] => {
  const out = new Array<number>(EMBED_DIMS).fill(0);
  for (let i = 0; i < text.length; i++) {
    out[i % EMBED_DIMS] += text.charCodeAt(i) / 255;
  }
  // L2 normalize
  const norm = Math.sqrt(out.reduce((s, x) => s + x * x, 0)) || 1;
  return out.map((x) => x / norm);
};

export const cosineSimilarity = (a: number[], b: number[]): number => {
  if (a.length !== b.length) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
};

/**
 * Initialise the RAG index. Idempotent: caches embeddings on disk keyed by
 * a hash of the chunk contents so we only call OpenAI when the KB changes.
 */
export const initRAG = async (kb: string = CONTACT_PRO_KNOWLEDGE_BASE): Promise<void> => {
  const chunks = chunkKnowledgeBase(kb);
  const hash = hashChunks(chunks);

  const cached = await loadCache();
  if (cached && cached.hash === hash && cached.model === EMBED_MODEL) {
    memo = { hash, chunks: cached.chunks };
    logger.info({ chunks: cached.chunks.length }, "RAG: loaded from cache");
    return;
  }

  logger.info({ chunks: chunks.length }, "RAG: building embeddings");
  const vectors = await embedTexts(chunks.map((c) => c.content));
  const embedded: EmbeddedChunk[] = chunks.map((c, i) => ({ ...c, embedding: vectors[i] }));
  memo = { hash, chunks: embedded };
  await saveCache({ model: EMBED_MODEL, hash, chunks: embedded });
  logger.info("RAG: embeddings cached");
};

/**
 * Retrieve the top-K most relevant chunks for a query.
 * If no embeddings have been built (init failed or no API key), returns the
 * full KB as a single chunk so the bot still has context.
 */
export const retrieve = async (query: string, topK = 3): Promise<Chunk[]> => {
  if (!memo || memo.chunks.length === 0) {
    return [{ id: "fallback", title: "Knowledge base", content: CONTACT_PRO_KNOWLEDGE_BASE }];
  }

  const [queryVec] = await embedTexts([query]);
  const scored = memo.chunks
    .map((c) => ({
      chunk: c,
      score: cosineSimilarity(queryVec, c.embedding),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);

  logger.debug(
    { query: query.slice(0, 80), top: scored.map((s) => ({ title: s.chunk.title, score: s.score.toFixed(3) })) },
    "RAG: retrieval",
  );

  return scored.map((s) => ({ id: s.chunk.id, title: s.chunk.title, content: s.chunk.content }));
};

export const __testing = { hashChunks, deterministicEmbedding };
