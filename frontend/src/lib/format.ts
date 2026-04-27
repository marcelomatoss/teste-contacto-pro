export const formatJid = (jid: string): string => {
  const number = jid.split("@")[0] || jid;
  if (number.length < 10) return number;
  // Best-effort BR formatting: 55 11 99999-9999
  if (number.startsWith("55") && (number.length === 12 || number.length === 13)) {
    const country = number.slice(0, 2);
    const ddd = number.slice(2, 4);
    const rest = number.slice(4);
    if (rest.length === 9) return `+${country} (${ddd}) ${rest.slice(0, 5)}-${rest.slice(5)}`;
    if (rest.length === 8) return `+${country} (${ddd}) ${rest.slice(0, 4)}-${rest.slice(4)}`;
  }
  return `+${number}`;
};

export const formatTime = (iso: string): string => {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  const time = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  if (sameDay) return time;
  return `${d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })} ${time}`;
};

export const initials = (name: string | null | undefined, jid?: string): string => {
  if (name) {
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  if (jid) {
    const num = jid.split("@")[0] || "";
    return num.slice(-2).toUpperCase();
  }
  return "?";
};

export const intentLabel = (intent: string | null | undefined): string => {
  switch (intent) {
    case "contact_z":
      return "Contact Z (WhatsApp)";
    case "contact_tel":
      return "Contact Tel (Voz)";
    case "mailing":
      return "Mailing";
    case "data_enrichment":
      return "Enriquecimento";
    case "pricing":
      return "Preço";
    case "human_handoff":
      return "Falar com humano";
    case "opt_out":
      return "Desinteresse";
    case "support":
      return "Suporte";
    case "general_question":
      return "Pergunta geral";
    default:
      return intent || "—";
  }
};

export const statusLabel = (status: string | null | undefined): string => {
  switch (status) {
    case "new":
      return "Novo";
    case "qualified":
      return "Qualificado";
    case "needs_human":
      return "Falar com humano";
    case "opt_out":
      return "Desinteresse";
    case "active":
      return "Em conversa";
    default:
      return status || "—";
  }
};
