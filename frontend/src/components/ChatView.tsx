import { useEffect, useRef } from "react";
import { MessageSquareDashed, Phone } from "lucide-react";
import type { Conversation, Message } from "../lib/types";
import { formatJid, initials } from "../lib/format";
import MessageBubble from "./MessageBubble";
import TypingIndicator from "./TypingIndicator";

interface Props {
  conversation: Conversation | null;
  messages: Message[];
  thinking: boolean;
  loading: boolean;
}

export const ChatView = ({ conversation, messages, thinking, loading }: Props) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, thinking]);

  if (!conversation) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-6 text-center">
        <div className="mb-4 rounded-2xl bg-slate-100 p-4">
          <MessageSquareDashed className="h-8 w-8 text-slate-400" />
        </div>
        <h3 className="text-base font-semibold text-slate-700">Selecione uma conversa</h3>
        <p className="mt-1 max-w-sm text-sm text-slate-500">
          As conversas chegam aqui em tempo real. Aguarde uma mensagem ou escolha uma já iniciada.
        </p>
      </div>
    );
  }

  const display = conversation.contactName || formatJid(conversation.whatsappJid);

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-slate-200 bg-white/70 px-6 py-4 backdrop-blur">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-500 text-sm font-semibold text-white">
          {initials(conversation.contactName, conversation.whatsappJid)}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-sm font-semibold text-slate-900">{display}</h2>
          <div className="flex items-center gap-1 text-xs text-slate-500">
            <Phone className="h-3 w-3" />
            <span>{formatJid(conversation.whatsappJid)}</span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto bg-gradient-to-b from-slate-50/50 to-slate-100/30 px-6 py-6">
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-sm text-slate-400">Carregando histórico…</div>
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
                <div className="h-8 w-8 rounded-full bg-brand-100" />
                <TypingIndicator />
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Footer info — read-only inbox, bot replies automatically */}
      <div className="border-t border-slate-200 bg-white px-6 py-3">
        <p className="text-center text-[11px] text-slate-400">
          Inbox somente leitura. O bot responde automaticamente via IA.
        </p>
      </div>
    </div>
  );
};

export default ChatView;
