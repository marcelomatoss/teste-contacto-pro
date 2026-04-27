import { collectDefaultMetrics, Counter, Gauge, Histogram, Registry } from "prom-client";

/**
 * Prometheus registry for Contact Pro Bot.
 *
 * Custom metrics chosen to answer the questions an oncall would actually ask:
 *
 *   - "How many messages are coming in vs going out?" → wa_messages_total
 *   - "Is the LLM slow?"                              → ai_call_duration_seconds
 *   - "What kind of leads are we getting?"           → ai_intent_total
 *   - "Is the queue backing up?"                     → queue_jobs_in_flight
 *   - "Are we paged on retries?"                     → queue_retries_total
 */
export const registry = new Registry();
registry.setDefaultLabels({ app: "contactpro-bot" });

collectDefaultMetrics({ register: registry, prefix: "node_" });

// ─── HTTP request latency ─────────────────────────────────────────────
export const httpDuration = new Histogram({
  name: "http_request_duration_seconds",
  help: "HTTP request latency by route + method + status",
  labelNames: ["method", "route", "status"],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
  registers: [registry],
});

// ─── WhatsApp ─────────────────────────────────────────────────────────
export const waMessages = new Counter({
  name: "wa_messages_total",
  help: "Total WhatsApp messages handled",
  labelNames: ["direction", "type"], // inbound|outbound, text|audio
  registers: [registry],
});

export const waReactions = new Counter({
  name: "wa_reactions_total",
  help: "Reactions emitted by the bot",
  labelNames: ["emoji"],
  registers: [registry],
});

// ─── AI ───────────────────────────────────────────────────────────────
export const aiCallDuration = new Histogram({
  name: "ai_call_duration_seconds",
  help: "Latency of upstream AI calls",
  labelNames: ["op"], // chat | classify | qualify | stt | tts | embed
  buckets: [0.1, 0.25, 0.5, 1, 2, 5, 10, 30],
  registers: [registry],
});

export const aiCallErrors = new Counter({
  name: "ai_call_errors_total",
  help: "Failures from upstream AI providers",
  labelNames: ["op"],
  registers: [registry],
});

export const intentClassified = new Counter({
  name: "ai_intent_total",
  help: "Distribution of classified intents",
  labelNames: ["intent"],
  registers: [registry],
});

export const leadStatusTransition = new Counter({
  name: "lead_status_transition_total",
  help: "Lead status transitions caused by the pipeline",
  labelNames: ["from", "to"],
  registers: [registry],
});

// ─── Queue ────────────────────────────────────────────────────────────
export const queueJobs = new Counter({
  name: "queue_jobs_total",
  help: "Inbound queue jobs by outcome",
  labelNames: ["outcome"], // completed | failed | retried
  registers: [registry],
});

export const queueInFlight = new Gauge({
  name: "queue_jobs_in_flight",
  help: "Inbound queue jobs currently being processed",
  registers: [registry],
});

// ─── Helpers ──────────────────────────────────────────────────────────

/**
 * Times an async operation, recording duration on success and incrementing
 * the error counter on failure. Always re-throws.
 */
export const timeAICall = async <T>(op: string, fn: () => Promise<T>): Promise<T> => {
  const end = aiCallDuration.startTimer({ op });
  try {
    const result = await fn();
    end();
    return result;
  } catch (err) {
    end();
    aiCallErrors.inc({ op });
    throw err;
  }
};
