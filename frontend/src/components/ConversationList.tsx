import clsx from "clsx";
import { Inbox, MessageSquare, Mic } from "lucide-react";
import type { Conversation } from "../lib/types";
import { formatJid, formatTime, initials, intentLabel } from "../lib/format";

interface Props {
  conversations: Conversation[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

const statusColor = (status: string): string => {
  switch (status) {
    case "needs_human":
      return "bg-amber-100 text-amber-800 ring-amber-200";
    case "opt_out":
      return "bg-rose-100 text-rose-700 ring-rose-200";
    case "qualified":
      return "bg-brand-100 text-brand-800 ring-brand-200";
    default:
      return "bg-slate-100 text-slate-600 ring-slate-200";
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
      ? last?.transcription || "Áudio"
      : last?.content || "Sem mensagens";

  return (
    <button
      onClick={onClick}
      className={clsx(
        "group w-full text-left transition-all",
        "border-l-2 px-4 py-3.5",
        active
          ? "border-brand-500 bg-brand-50/60"
          : "border-transparent hover:bg-slate-50",
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={clsx(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold",
            active
              ? "bg-brand-500 text-white"
              : "bg-slate-200 text-slate-600 group-hover:bg-slate-300",
          )}
        >
          {initials(conv.contactName, conv.whatsappJid)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <h3 className="truncate text-sm font-semibold text-slate-900">{display}</h3>
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
                "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ring-1",
                statusColor(conv.status),
              )}
            >
              {conv.status === "active"
                ? "ativo"
                : conv.status === "needs_human"
                  ? "→ humano"
                  : conv.status === "opt_out"
                    ? "opt-out"
                    : conv.status}
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

export const ConversationList = ({ conversations, selectedId, onSelect }: Props) => {
  if (conversations.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-6 text-center">
        <div className="mb-3 rounded-2xl bg-slate-100 p-3">
          <Inbox className="h-6 w-6 text-slate-400" />
        </div>
        <p className="text-sm font-medium text-slate-700">Nenhuma conversa ainda</p>
        <p className="mt-1 max-w-xs text-xs text-slate-500">
          Quando alguém enviar uma mensagem para o WhatsApp conectado, ela vai aparecer aqui em
          tempo real.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-slate-500" />
          <h2 className="text-sm font-semibold text-slate-800">Conversas</h2>
        </div>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
          {conversations.length}
        </span>
      </div>
      <div className="flex-1 overflow-y-auto">
        {conversations.map((conv) => (
          <ConversationItem
            key={conv.id}
            conv={conv}
            active={conv.id === selectedId}
            onClick={() => onSelect(conv.id)}
          />
        ))}
      </div>
    </div>
  );
};

export default ConversationList;
