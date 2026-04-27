import { askLLMForJSON, type ChatMessage } from "./llm.js";

export const INTENT_VALUES = [
  "contact_z",
  "contact_tel",
  "mailing",
  "data_enrichment",
  "pricing",
  "human_handoff",
  "opt_out",
  "support",
  "general_question",
] as const;

export type Intent = (typeof INTENT_VALUES)[number];

interface IntentResult {
  intent: Intent;
  confidence: number;
}

export const classifyIntent = async (
  history: ChatMessage[],
  latestUserMessage: string,
): Promise<Intent> => {
  const condensed = history
    .slice(-8)
    .map((m) => `${m.role === "user" ? "LEAD" : "BOT"}: ${m.content}`)
    .join("\n");

  const prompt = `Você é um classificador. Sua tarefa é classificar a mensagem mais recente do LEAD em uma das categorias:

- contact_z          → interesse em WhatsApp / atendimento / automação digital
- contact_tel        → interesse em ligações / URA / agentes de voz
- mailing            → quer comprar listas / mailings / contatos
- data_enrichment    → quer enriquecer / higienizar base de dados existente
- pricing            → está perguntando preço, valores, custos
- human_handoff      → quer falar com humano / atendente / consultor
- opt_out            → não quer mais conversar / desinteresse claro
- support            → suporte técnico / dúvida operacional sobre produto já contratado
- general_question   → saudação, dúvida genérica, qualquer outra coisa

Histórico recente:
${condensed || "(sem histórico)"}

Mensagem mais recente do LEAD:
"${latestUserMessage}"`;

  const schema = `{
  "intent": "contact_z | contact_tel | mailing | data_enrichment | pricing | human_handoff | opt_out | support | general_question",
  "confidence": <number entre 0 e 1>
}`;

  const result = await askLLMForJSON<IntentResult>(prompt, schema, "classify");
  if (!result) return "general_question";
  if (!INTENT_VALUES.includes(result.intent)) return "general_question";
  return result.intent;
};
