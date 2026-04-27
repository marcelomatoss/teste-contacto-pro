import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { env, isAIConfigured } from "../config/env.js";
import { logger } from "../config/logger.js";
import { CONTACT_PRO_KNOWLEDGE_BASE } from "../knowledge/contactpro.js";
import { retrieve } from "./rag.js";
import { timeAICall } from "../observability/metrics.js";

let anthropic: Anthropic | null = null;
let openai: OpenAI | null = null;

const getAnthropic = () => {
  if (!anthropic && env.AI_API_KEY) {
    anthropic = new Anthropic({ apiKey: env.AI_API_KEY });
  }
  return anthropic;
};

const getOpenAI = () => {
  if (!openai && env.AI_API_KEY) {
    openai = new OpenAI({ apiKey: env.AI_API_KEY });
  }
  return openai;
};

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface LeadSnapshot {
  name: string | null;
  company: string | null;
  phone: string | null;
  serviceInterest: string | null;
  leadGoal: string | null;
  estimatedVolume: string | null;
  status: string | null;
  intent?: string | null;
}

const buildSystemPrompt = (lead: LeadSnapshot, retrievedContext: string) => {
  const known = [
    lead.name && `Nome: ${lead.name}`,
    lead.company && `Empresa: ${lead.company}`,
    lead.serviceInterest && `Interesse: ${lead.serviceInterest}`,
    lead.leadGoal && `Objetivo: ${lead.leadGoal}`,
    lead.estimatedVolume && `Volume estimado: ${lead.estimatedVolume}`,
    lead.status && `Status atual: ${lead.status}`,
    lead.intent && `Intenção detectada: ${lead.intent}`,
  ]
    .filter(Boolean)
    .join("\n");

  return `Você é o assistente comercial digital da Contact Pro. Sua missão é fazer o atendimento inicial de leads no WhatsApp, explicar serviços, qualificar a oportunidade e direcionar para o time humano quando fizer sentido.

# Conhecimento relevante para esta conversa

${retrievedContext}

# Regras de comportamento

1. Responda em português brasileiro, de forma cordial, objetiva e profissional.
2. Mensagens curtas (2-4 frases). Evite paredes de texto. Esta é uma conversa de WhatsApp.
3. Sempre que possível, faça uma pergunta de qualificação ao final.
4. Nunca invente preços, descontos ou prazos. Quando perguntarem preço, peça mais contexto (volume, objetivo) e diga que um consultor humano passará a proposta personalizada.
5. Se o lead pedir falar com humano, confirme que vai transferir.
6. Se o lead demonstrar claro desinteresse, encerre cordialmente.
7. Se já tem dados do lead, use-os sem repetir perguntas.
8. Não use emojis em excesso (no máximo 1 por mensagem).
9. Não fale como robô ("entendi sua solicitação", "aguarde um momento"). Fale como pessoa.

# Estado atual do lead
${known || "(sem dados ainda)"}

# Sua próxima resposta deve avançar a conversa de forma útil.`;
};

export const generateReply = async (
  history: ChatMessage[],
  lead: LeadSnapshot,
): Promise<string> => {
  if (!isAIConfigured()) {
    return "Olá! Sou o assistente da Contact Pro. Estou em modo de demonstração sem chave de IA configurada. Configure AI_API_KEY no .env para conversar comigo.";
  }

  // RAG: pull only the chunks most relevant to the conversation so far,
  // falling back to the full KB when retrieval is unavailable.
  const lastUser = [...history].reverse().find((m) => m.role === "user")?.content ?? "";
  let retrievedContext = CONTACT_PRO_KNOWLEDGE_BASE;
  if (lastUser) {
    try {
      const chunks = await retrieve(lastUser, 3);
      if (chunks.length > 0) {
        retrievedContext = chunks.map((c) => c.content).join("\n\n---\n\n");
      }
    } catch (err) {
      logger.warn({ err }, "RAG retrieval failed, using full KB");
    }
  }

  const system = buildSystemPrompt(lead, retrievedContext);

  return timeAICall("chat", async () => {
    if (env.AI_PROVIDER === "anthropic") {
      const client = getAnthropic();
      if (!client) throw new Error("Anthropic client not configured");

      const response = await client.messages.create({
        model: env.AI_MODEL,
        max_tokens: 512,
        system,
        messages: history.map((m) => ({ role: m.role, content: m.content })),
      });

      const text = response.content
        .filter((c): c is Anthropic.TextBlock => c.type === "text")
        .map((c) => c.text)
        .join("\n")
        .trim();

      return text || "Desculpe, não consegui gerar uma resposta agora.";
    }

    const client = getOpenAI();
    if (!client) throw new Error("OpenAI client not configured");

    const response = await client.chat.completions.create({
      model: env.AI_MODEL,
      max_tokens: 512,
      messages: [
        { role: "system", content: system },
        ...history.map((m) => ({ role: m.role, content: m.content })),
      ],
    });

    return (
      response.choices[0]?.message?.content?.trim() ||
      "Desculpe, não consegui gerar uma resposta agora."
    );
  });
};

export const askLLMForJSON = async <T>(
  prompt: string,
  schemaDescription: string,
  op: string = "json",
): Promise<T | null> => {
  if (!isAIConfigured()) return null;

  const fullPrompt = `${prompt}\n\nResponda APENAS com JSON válido seguindo este schema:\n${schemaDescription}\n\nNão inclua texto fora do JSON. Não use markdown.`;

  try {
    return await timeAICall(op, async () => {
      if (env.AI_PROVIDER === "anthropic") {
        const client = getAnthropic();
        if (!client) return null as T | null;

        const response = await client.messages.create({
          model: env.AI_MODEL,
          max_tokens: 512,
          messages: [{ role: "user", content: fullPrompt }],
        });

        const text = response.content
          .filter((c): c is Anthropic.TextBlock => c.type === "text")
          .map((c) => c.text)
          .join("")
          .trim();

        const cleaned = text.replace(/^```json\s*/i, "").replace(/```\s*$/, "").trim();
        return JSON.parse(cleaned) as T;
      }

      const client = getOpenAI();
      if (!client) return null as T | null;
      const response = await client.chat.completions.create({
        model: env.AI_MODEL,
        max_tokens: 512,
        response_format: { type: "json_object" },
        messages: [{ role: "user", content: fullPrompt }],
      });
      const text = response.choices[0]?.message?.content?.trim();
      if (!text) return null as T | null;
      return JSON.parse(text) as T;
    });
  } catch (err) {
    logger.error({ err }, "askLLMForJSON failed");
    return null;
  }
};
