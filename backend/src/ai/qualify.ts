import { askLLMForJSON, type ChatMessage, type LeadSnapshot } from "./llm.js";

export interface LeadExtraction {
  name: string | null;
  company: string | null;
  phone: string | null;
  serviceInterest:
    | "contact_z"
    | "contact_tel"
    | "mailing"
    | "data_enrichment"
    | "unknown"
    | null;
  leadGoal: string | null;
  estimatedVolume: string | null;
}

export const qualifyLead = async (
  history: ChatMessage[],
  latestUserMessage: string,
  current: LeadSnapshot,
): Promise<LeadExtraction | null> => {
  const condensed = history
    .slice(-12)
    .map((m) => `${m.role === "user" ? "LEAD" : "BOT"}: ${m.content}`)
    .join("\n");

  const currentJson = JSON.stringify(
    {
      name: current.name,
      company: current.company,
      phone: current.phone,
      serviceInterest: current.serviceInterest,
      leadGoal: current.leadGoal,
      estimatedVolume: current.estimatedVolume,
    },
    null,
    2,
  );

  const prompt = `Você extrai dados de qualificação de leads a partir de conversas de WhatsApp.

Dados que já temos do lead:
${currentJson}

Histórico da conversa:
${condensed || "(sem histórico)"}

Mensagem mais recente do LEAD:
"${latestUserMessage}"

Sua tarefa: retornar os campos preenchidos com base em TUDO que já foi dito. Se um campo já existe e a conversa não traz novidade, mantenha o valor atual. Se não há informação clara, retorne null. NUNCA invente dados.

Mapeamento serviceInterest:
- contact_z         → WhatsApp / atendimento / automação / chatbot
- contact_tel       → ligação / URA / discador / agente de voz
- mailing           → comprar listas / contatos / leads frios
- data_enrichment   → enriquecer / higienizar / validar base existente
- unknown           → quando ainda não dá pra inferir`;

  const schema = `{
  "name": "<string | null>",
  "company": "<string | null>",
  "phone": "<string | null>",
  "serviceInterest": "contact_z | contact_tel | mailing | data_enrichment | unknown | null",
  "leadGoal": "<descrição curta do objetivo do lead | null>",
  "estimatedVolume": "<volume aproximado em texto curto | null>"
}`;

  return askLLMForJSON<LeadExtraction>(prompt, schema);
};
