import clsx from "clsx";
import { Inbox, MessageSquare, Mic, Search } from "lucide-react";
import { useMemo, useState } from "react";
import type { Conversation } from "../lib/types";
import { formatJid, formatTime, initials, intentLabel } from "../lib/format";

interface Props {
  conversations: Conversation[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

const statusBadgeClass = (status: string): string => {
  switch (status) {
    case "needs_human":
      return "bg-amber-100 text-amber-800 ring-amber-200";
    case "opt_out":
      return "bg-rose-100 text-rose-700 ring-rose-200";
    case "qualified":
      return "bg-accent-100 text-accent-800 ring-accent-200";
    default:
      return "bg-slate-100 text-slate-600 ring-slate-200";
  }
};

const statusLabelShort = (status: string): string => {
  switch (status) {
    case "active":
      return "ativo";
    case "needs_human":
      return "→ humano";
    case "opt_out":
      return "opt-out";
    case "qualified":
      return "qualificado";
    default:
      return status;
  }
};

const ConversationItem = ({
  conv,
  active,
  onClick,
}: {
  conv: Conversation;
  active: boolean;
  onClick: () => void;
}) => {
  const last = conv.messages?.[0];
  const display = conv.contactName || formatJid(conv.whatsappJid);
  const lastText =
    last?.type === "audio"
      ? last?.transcription || "Mensagem de áudio"
      : last?.content || "Sem mensagens";

  return (
    <button
      onClick={onClick}
      className={clsx(
        "press group relative w-full text-left transition-colors duration-150",
        "border-l-[3px] px-4 py-3.5",
        active
          ? "border-brand-600 bg-brand-50/70"
          : "border-transparent hover:bg-slate-50/80",
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={clsx(
            "relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold transition-all duration-200",
            active
              ? "bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-card"
              : "bg-slate-100 text-slate-600 group-hover:bg-slate-200",
          )}
        >
          {initials(conv.contactName, conv.whatsappJid)}
          {conv.status === "qualified" && (
            <span
              aria-hidden
              className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-accent-500"
            />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <h3
              className={clsx(
                "truncate font-heading text-sm font-semibold",
                active ? "text-brand-900" : "text-slate-900",
              )}
            >
              {display}
            </h3>
            {last && (
              <span className="shrink-0 text-[11px] font-medium text-slate-400">
                {formatTime(last.createdAt)}
              </span>
            )}
          </div>
          <div className="mt-0.5 flex items-center gap-1.5">
            {last?.type === "audio" && <Mic className="h-3 w-3 shrink-0 text-slate-400" />}
            <p className="truncate text-xs text-slate-500">{lastText}</p>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <span
              className={clsx(
                "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1",
                statusBadgeClass(conv.status),
              )}
            >
              {statusLabelShort(conv.status)}
            </span>
            {conv.intent && (
              <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600 ring-1 ring-slate-200">
                {intentLabel(conv.intent)}
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
};

const EmptyState = () => (
  <div className="flex h-full flex-col items-center justify-center px-8 text-center">
    <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-100 to-accent-100 shadow-card">
      <Inbox className="h-7 w-7 text-brand-600" />
    </div>
    <h3 className="font-heading text-base font-semibold text-slate-800">Inbox vazia</h3>
    <p className="mt-1.5 max-w-xs text-xs leading-relaxed text-slate-500">
      Quando alguém enviar uma mensagem para o WhatsApp conectado, ela aparecerá aqui em
      tempo real.
    </p>
  </div>
);

export const ConversationList = ({ conversations, selectedId, onSelect }: Props) => {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter((c) => {
      const name = (c.contactName || "").toLowerCase();
      const jid = c.whatsappJid.toLowerCase();
      const intent = (c.intent || "").toLowerCase();
      const last = c.messages?.[0];
      const lastText = (last?.content || last?.transcription || "").toLowerCase();
      return (
        name.includes(q) ||
        jid.includes(q) ||
        intent.includes(q) ||
        lastText.includes(q)
      );
    });
  }, [query, conversations]);

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-slate-200/70 px-5 pt-4 pb-3">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-brand-600" />
            <h2 className="font-heading text-sm font-bold text-slate-800">Conversas</h2>
          </div>
          <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-bold text-brand-700 ring-1 ring-brand-200">
            {conversations.length}
          </span>
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            type="text"
            placeholder="Buscar nome, telefone, intent…"
            className="w-full rounded-lg border border-slate-200 bg-white/70 py-2 pl-9 pr-3 text-xs font-medium text-slate-700 placeholder:font-normal placeholder:text-slate-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100 transition-all"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {conversations.length === 0 ? (
          <EmptyState />
        ) : filtered.length === 0 ? (
          <p className="px-5 pt-8 text-center text-xs text-slate-400">
            Nenhuma conversa para "{query}"
          </p>
        ) : (
          <ul className="py-1">
            {filtered.map((conv) => (
              <li key={conv.id}>
                <ConversationItem
                  conv={conv}
                  active={conv.id === selectedId}
                  onClick={() => onSelect(conv.id)}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default ConversationList;
