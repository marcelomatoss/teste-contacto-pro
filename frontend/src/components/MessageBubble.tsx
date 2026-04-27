import clsx from "clsx";
import { Bot, Check, CheckCheck, Mic, User } from "lucide-react";
import type { Message } from "../lib/types";
import { formatTime } from "../lib/format";
import AudioPlayer from "./AudioPlayer";

interface Props {
  message: Message;
}

const StatusIcon = ({ status }: { status: string }) => {
  if (status === "sent") return <Check className="h-3 w-3 text-white/70" />;
  if (status === "delivered") return <CheckCheck className="h-3 w-3 text-white/70" />;
  if (status === "failed") return <span className="text-rose-200 text-[10px]">falha</span>;
  return null;
};

export const MessageBubble = ({ message }: Props) => {
  const outbound = message.direction === "outbound";

  return (
    <div className={clsx("flex w-full gap-2", outbound ? "justify-end" : "justify-start")}>
      {!outbound && (
        <div className="mt-auto flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-600">
          <User className="h-4 w-4" />
        </div>
      )}

      <div className={clsx("flex max-w-[78%] flex-col", outbound ? "items-end" : "items-start")}>
        <div
          className={clsx(
            "rounded-2xl px-3.5 py-2.5 shadow-card",
            outbound
              ? "rounded-br-md bg-brand-600 text-white"
              : "rounded-bl-md bg-white text-slate-800 ring-1 ring-slate-200",
          )}
        >
          {message.type === "audio" ? (
            <div className="space-y-2">
              <AudioPlayer messageId={message.id} outbound={outbound} />
              {message.transcription ? (
                <p
                  className={clsx(
                    "text-[13px] italic leading-snug",
                    outbound ? "text-white/90" : "text-slate-600",
                  )}
                >
                  &ldquo;{message.transcription}&rdquo;
                </p>
              ) : (
                <div
                  className={clsx(
                    "flex items-center gap-1.5 text-[12px]",
                    outbound ? "text-white/80" : "text-slate-500",
                  )}
                >
                  <Mic className="h-3 w-3" />
                  Transcrevendo áudio…
                </div>
              )}
            </div>
          ) : (
            <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</p>
          )}
        </div>

        <div className="mt-1 flex items-center gap-1.5 px-1">
          <span className="text-[10px] font-medium text-slate-400">
            {formatTime(message.createdAt)}
          </span>
          {outbound && <StatusIcon status={message.status} />}
          {message.reaction && (
            <span className="rounded-full bg-white px-1.5 py-0.5 text-[11px] shadow-sm ring-1 ring-slate-200">
              {message.reaction}
            </span>
          )}
        </div>
      </div>

      {outbound && (
        <div className="mt-auto flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-700">
          <Bot className="h-4 w-4" />
        </div>
      )}
    </div>
  );
};

export default MessageBubble;
