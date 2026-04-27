import { useEffect, useRef } from "react";
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

export const ChatView = ({ conversation, messages, thinking, loading }: Props) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, thinking]);

  if (!conversation) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-6 text-center">
        <div className="relative mb-5">
          <div className="absolute inset-0 -z-10 rounded-3xl bg-gradient-to-br from-brand-100 to-accent-100 blur-2xl opacity-70" />
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-card-lg ring-1 ring-slate-200">
            <MessageSquareDashed className="h-8 w-8 text-brand-600" />
          </div>
        </div>
        <h3 className="font-heading text-base font-bold text-slate-800">
          Selecione uma conversa
        </h3>
        <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-slate-500">
          As conversas chegam aqui em tempo real. Aguarde uma nova mensagem ou escolha uma já
          iniciada na lista.
        </p>
      </div>
    );
  }

  const display = conversation.contactName || formatJid(conversation.whatsappJid);

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="glass sticky top-0 z-10 flex items-center gap-3 border-b border-slate-200/60 px-6 py-3.5">
        <div className="relative">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-sm font-bold text-white shadow-card ring-2 ring-white">
            {initials(conversation.contactName, conversation.whatsappJid)}
          </div>
          {conversation.status === "qualified" && (
            <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-accent-500" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="truncate font-heading text-sm font-bold text-slate-900">
            {display}
          </h2>
          <div className="flex items-center gap-2 text-[11px] font-medium text-slate-500">
            <span className="inline-flex items-center gap-1">
              <Phone className="h-3 w-3" />
              {formatJid(conversation.whatsappJid)}
            </span>
            {conversation.intent && (
              <>
                <span className="text-slate-300">·</span>
                <span className="text-brand-700">{intentLabel(conversation.intent)}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        {loading ? (
          <div className="mx-auto flex max-w-3xl flex-col gap-3">
            <SkeletonMessage side="left" />
            <SkeletonMessage side="right" />
            <SkeletonMessage side="left" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-slate-400">Sem mensagens nesta conversa ainda.</p>
          </div>
        ) : (
          <div className="mx-auto flex max-w-3xl flex-col gap-3">
            {messages.map((m) => (
              <MessageBubble key={m.id} message={m} />
            ))}
            {thinking && (
              <div className="flex items-end gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-brand-100 to-accent-100 ring-1 ring-brand-200/60">
                  <Bot className="h-4 w-4 text-brand-700" />
                </div>
                <TypingIndicator />
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Footer info */}
      <div className="border-t border-slate-200/70 bg-white/40 px-6 py-2.5 backdrop-blur">
        <p className="flex items-center justify-center gap-1.5 text-center text-[11px] font-medium text-slate-400">
          <ShieldCheck className="h-3 w-3" />
          Inbox somente leitura · o bot responde automaticamente via IA
        </p>
      </div>
    </div>
  );
};

export default ChatView;
