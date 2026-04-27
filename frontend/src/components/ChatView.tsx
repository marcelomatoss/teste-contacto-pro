import { Fragment, useEffect, useMemo, useRef } from "react";
import { Bot, MessageSquareDashed, Phone, ShieldCheck } from "lucide-react";
import type { Conversation, Message } from "../lib/types";
import { formatJid, initials, intentLabel } from "../lib/format";
import MessageBubble from "./MessageBubble";
import TypingIndicator from "./TypingIndicator";

interface Props {
  conversation: Conversation | null;
  messages: Message[];
  thinking: boolean;
  loading: boolean;
}

const SkeletonMessage = ({ side }: { side: "left" | "right" }) => (
  <div
    className={`flex w-full gap-2 ${side === "right" ? "justify-end" : "justify-start"}`}
  >
    {side === "left" && <div className="h-8 w-8 shrink-0 rounded-full skeleton" />}
    <div
      className={`h-16 w-2/3 max-w-md rounded-2xl skeleton ${
        side === "right" ? "rounded-br-md" : "rounded-bl-md"
      }`}
    />
    {side === "right" && <div className="h-8 w-8 shrink-0 rounded-full skeleton" />}
  </div>
);

const dayLabel = (iso: string): string => {
  const d = new Date(iso);
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);

  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  if (isSameDay(d, now)) return "Hoje";
  if (isSameDay(d, yesterday)) return "Ontem";
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: d.getFullYear() === now.getFullYear() ? undefined : "numeric",
  });
};

const dayKey = (iso: string): string => new Date(iso).toDateString();

interface MsgWithGrouping {
  message: Message;
  showDay: boolean;
  isGroupStart: boolean;  // first of a run from the same direction
  isGroupEnd: boolean;    // last of a run from the same direction
}

const groupMessages = (messages: Message[]): MsgWithGrouping[] => {
  return messages.map((m, i) => {
    const prev = messages[i - 1];
    const next = messages[i + 1];
    const showDay = !prev || dayKey(prev.createdAt) !== dayKey(m.createdAt);
    const isGroupStart = !prev || prev.direction !== m.direction || showDay;
    const isGroupEnd =
      !next || next.direction !== m.direction || dayKey(next.createdAt) !== dayKey(m.createdAt);
    return { message: m, showDay, isGroupStart, isGroupEnd };
  });
};

export const ChatView = ({ conversation, messages, thinking, loading }: Props) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, thinking]);

  const grouped = useMemo(() => groupMessages(messages), [messages]);

  if (!conversation) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-6 text-center">
        <div className="relative mb-5">
          <div
            aria-hidden
            className="absolute inset-0 -z-10 rounded-3xl bg-gradient-to-br from-brand-200/50 to-accent-200/50 blur-2xl"
          />
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-card-lg ring-1 ring-slate-200">
            <MessageSquareDashed className="h-8 w-8 text-brand-600" aria-hidden />
          </div>
        </div>
        <h2 className="font-heading text-lg font-bold text-slate-800">
          Selecione uma conversa
        </h2>
        <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-slate-500">
          As conversas chegam aqui em tempo real. Aguarde uma nova mensagem ou escolha uma já
          iniciada na lista à esquerda.
        </p>
      </div>
    );
  }

  const display = conversation.contactName || formatJid(conversation.whatsappJid);
  const isQualified = conversation.lead?.status === "qualified";

  return (
    <div className="flex h-full flex-col" aria-label="Conversa selecionada">
      {/* Header */}
      <div className="glass sticky top-0 z-content flex items-center gap-3 border-b border-slate-200/60 px-6 py-3.5">
        <div
          className="avatar-with-status"
          data-status={isQualified ? "online" : undefined}
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-sm font-bold text-white shadow-card ring-2 ring-white">
            {initials(conversation.contactName, conversation.whatsappJid)}
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="truncate font-heading text-base font-bold text-slate-900">
            {display}
          </h2>
          <div className="flex items-center gap-2 text-2xs font-medium text-slate-500">
            <span className="inline-flex items-center gap-1">
              <Phone className="h-3 w-3" aria-hidden />
              {formatJid(conversation.whatsappJid)}
            </span>
            {conversation.intent && (
              <>
                <span aria-hidden className="text-slate-300">·</span>
                <span className="font-semibold text-brand-700">
                  {intentLabel(conversation.intent)}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-6" aria-live="polite">
        {loading ? (
          <div className="mx-auto flex max-w-3xl flex-col gap-3">
            <SkeletonMessage side="left" />
            <SkeletonMessage side="right" />
            <SkeletonMessage side="left" />
          </div>
        ) : grouped.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-slate-400">Sem mensagens nesta conversa ainda.</p>
          </div>
        ) : (
          <div className="mx-auto flex max-w-3xl flex-col gap-1.5">
            {grouped.map(({ message, showDay, isGroupStart, isGroupEnd }) => (
              <Fragment key={message.id}>
                {showDay && (
                  <div className="my-3 flex items-center gap-3" aria-hidden>
                    <div className="h-px flex-1 bg-slate-200/60" />
                    <span className="rounded-full bg-white px-3 py-1 text-2xs font-bold uppercase tracking-wider text-slate-500 ring-1 ring-slate-200">
                      {dayLabel(message.createdAt)}
                    </span>
                    <div className="h-px flex-1 bg-slate-200/60" />
                  </div>
                )}
                <MessageBubble
                  message={message}
                  isGroupStart={isGroupStart}
                  isGroupEnd={isGroupEnd}
                />
              </Fragment>
            ))}
            {thinking && (
              <div className="mt-3 flex items-end gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-brand-100 to-accent-100 ring-1 ring-brand-200/60">
                  <Bot className="h-4 w-4 text-brand-700" aria-hidden />
                </div>
                <TypingIndicator />
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-slate-200/70 bg-white/40 px-6 py-2.5 backdrop-blur">
        <p className="flex items-center justify-center gap-1.5 text-center text-2xs font-medium text-slate-400">
          <ShieldCheck className="h-3 w-3" aria-hidden />
          Inbox somente leitura · o bot responde automaticamente via IA
        </p>
      </div>
    </div>
  );
};

export default ChatView;
