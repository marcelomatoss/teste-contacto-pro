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

const STATUS_BADGE: Record<string, { cls: string; label: string }> = {
  active: { cls: "bg-slate-100 text-slate-600 ring-slate-200", label: "ativo" },
  qualified: { cls: "bg-accent-100 text-accent-800 ring-accent-200", label: "qualificado" },
  needs_human: { cls: "bg-amber-100 text-amber-800 ring-amber-200", label: "→ humano" },
  opt_out: { cls: "bg-rose-100 text-rose-700 ring-rose-200", label: "opt-out" },
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

  const statusInfo = STATUS_BADGE[conv.status] || STATUS_BADGE.active;

  return (
    <button
      onClick={onClick}
      aria-current={active ? "true" : undefined}
      className={clsx(
        "press group relative flex w-full items-start gap-3 px-4 py-3.5 text-left",
        "transition-colors duration-fast",
        "border-l-[3px] ring-focus",
        active
          ? "border-brand-600 bg-brand-50/70"
          : "border-transparent hover:bg-slate-50/80",
      )}
    >
      {/* Avatar */}
      <div
        className={clsx(
          "relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold transition-all duration-base",
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

      {/* Content */}
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
            <time
              dateTime={last.createdAt}
              className="shrink-0 text-2xs font-medium text-slate-400"
            >
              {formatTime(last.createdAt)}
            </time>
          )}
        </div>
        <div className="mt-0.5 flex items-center gap-1.5">
          {last?.type === "audio" && (
            <Mic className="h-3 w-3 shrink-0 text-slate-400" aria-hidden />
          )}
          <p className="truncate text-xs text-slate-500">{lastText}</p>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <span
            className={clsx(
              "inline-flex items-center rounded-full px-2 py-0.5 text-2xs font-bold uppercase tracking-wider ring-1",
              statusInfo.cls,
            )}
          >
            {statusInfo.label}
          </span>
          {conv.intent && (
            <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-2xs font-semibold text-slate-600 ring-1 ring-slate-200">
              {intentLabel(conv.intent)}
            </span>
          )}
        </div>
      </div>
    </button>
  );
};

const EmptyState = () => (
  <div className="flex h-full flex-col items-center justify-center px-8 text-center">
    <div className="relative mb-4">
      <div
        aria-hidden
        className="absolute inset-0 -z-10 rounded-2xl bg-gradient-to-br from-brand-200/40 to-accent-200/40 blur-xl"
      />
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-card-lg ring-1 ring-slate-200">
        <Inbox className="h-7 w-7 text-brand-600" />
      </div>
    </div>
    <h3 className="font-heading text-base font-bold text-slate-800">Inbox vazia</h3>
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
        name.includes(q) || jid.includes(q) || intent.includes(q) || lastText.includes(q)
      );
    });
  }, [query, conversations]);

  const grouped = useMemo(() => {
    const buckets = {
      pinned: [] as Conversation[],
      active: [] as Conversation[],
      closed: [] as Conversation[],
    };
    for (const c of filtered) {
      if (c.status === "needs_human") buckets.pinned.push(c);
      else if (c.status === "opt_out") buckets.closed.push(c);
      else buckets.active.push(c);
    }
    return buckets;
  }, [filtered]);

  return (
    <div className="flex h-full flex-col" aria-label="Lista de conversas">
      {/* Header */}
      <div className="border-b border-slate-200/70 px-5 pt-4 pb-3">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-brand-600" aria-hidden />
            <h2 className="font-heading text-sm font-bold text-slate-800">Conversas</h2>
          </div>
          <span
            className="rounded-full bg-brand-50 px-2 py-0.5 text-2xs font-bold tracking-wider text-brand-700 ring-1 ring-brand-200"
            aria-label={`${conversations.length} conversas`}
          >
            {conversations.length}
          </span>
        </div>
        <label className="relative block">
          <span className="sr-only">Buscar conversas</span>
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
            aria-hidden
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            type="text"
            placeholder="Buscar nome, telefone, intent…"
            className="ring-focus w-full rounded-lg border border-slate-200 bg-white/80 py-2 pl-9 pr-3 text-xs font-medium text-slate-700 placeholder:font-normal placeholder:text-slate-400 transition-colors duration-base focus:border-brand-400 focus:bg-white"
          />
        </label>
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
          <>
            {grouped.pinned.length > 0 && (
              <SectionHeader label="Aguardando humano" count={grouped.pinned.length} tone="amber" />
            )}
            <ul>
              {grouped.pinned.map((conv) => (
                <li key={conv.id}>
                  <ConversationItem
                    conv={conv}
                    active={conv.id === selectedId}
                    onClick={() => onSelect(conv.id)}
                  />
                </li>
              ))}
            </ul>
            {grouped.active.length > 0 && (
              <SectionHeader label="Ativas" count={grouped.active.length} tone="brand" />
            )}
            <ul>
              {grouped.active.map((conv) => (
                <li key={conv.id}>
                  <ConversationItem
                    conv={conv}
                    active={conv.id === selectedId}
                    onClick={() => onSelect(conv.id)}
                  />
                </li>
              ))}
            </ul>
            {grouped.closed.length > 0 && (
              <SectionHeader label="Encerradas" count={grouped.closed.length} tone="muted" />
            )}
            <ul>
              {grouped.closed.map((conv) => (
                <li key={conv.id}>
                  <ConversationItem
                    conv={conv}
                    active={conv.id === selectedId}
                    onClick={() => onSelect(conv.id)}
                  />
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
};

const SectionHeader = ({
  label,
  count,
  tone,
}: {
  label: string;
  count: number;
  tone: "brand" | "amber" | "muted";
}) => {
  const toneCls =
    tone === "amber"
      ? "text-amber-700"
      : tone === "brand"
        ? "text-slate-500"
        : "text-slate-400";
  return (
    <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/40 px-5 py-1.5">
      <h3
        className={clsx(
          "text-2xs font-bold uppercase tracking-wider",
          toneCls,
        )}
      >
        {label}
      </h3>
      <span className="text-2xs font-semibold text-slate-400">{count}</span>
    </div>
  );
};

export default ConversationList;
