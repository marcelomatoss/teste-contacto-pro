import clsx from "clsx";
import { AlertTriangle, Bot, Check, CheckCheck, Mic, User } from "lucide-react";
import type { Message } from "../lib/types";
import { formatTime } from "../lib/format";
import AudioPlayer from "./AudioPlayer";

interface Props {
  message: Message;
  isGroupStart?: boolean;
  isGroupEnd?: boolean;
}

const StatusIcon = ({ status }: { status: string }) => {
  if (status === "sent") return <Check className="h-3 w-3 text-white/80" aria-label="enviado" />;
  if (status === "delivered")
    return <CheckCheck className="h-3 w-3 text-white/80" aria-label="entregue" />;
  if (status === "failed")
    return (
      <span className="inline-flex items-center gap-0.5 text-2xs font-bold text-rose-200">
        <AlertTriangle className="h-2.5 w-2.5" aria-hidden />
        falha
      </span>
    );
  return null;
};

export const MessageBubble = ({
  message,
  isGroupStart = true,
  isGroupEnd = true,
}: Props) => {
  const outbound = message.direction === "outbound";

  // Tail-aware corner radius — tighter when grouped
  const tailRadius = outbound
    ? clsx(
        "rounded-2xl",
        isGroupStart ? "rounded-tr-2xl" : "rounded-tr-md",
        isGroupEnd ? "rounded-br-md" : "rounded-br-md",
      )
    : clsx(
        "rounded-2xl",
        isGroupStart ? "rounded-tl-2xl" : "rounded-tl-md",
        isGroupEnd ? "rounded-bl-md" : "rounded-bl-md",
      );

  return (
    <div
      className={clsx(
        "flex w-full gap-2 animate-fade-in",
        outbound ? "justify-end" : "justify-start",
        // Tighter spacing within a group
        !isGroupStart && "mt-0.5",
      )}
    >
      {/* Avatar — only on group end (closest to bubble) */}
      {!outbound && (
        <div className="w-8 shrink-0">
          {isGroupEnd ? (
            <div className="mt-auto flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-slate-600 ring-1 ring-slate-100">
              <User className="h-4 w-4" aria-hidden />
            </div>
          ) : null}
        </div>
      )}

      <div className={clsx("flex max-w-[78%] flex-col", outbound ? "items-end" : "items-start")}>
        <div
          className={clsx(
            "px-3.5 py-2.5 transition-shadow duration-base",
            tailRadius,
            outbound
              ? "bg-gradient-to-br from-brand-600 to-brand-700 text-white shadow-card-lg"
              : "bg-white text-slate-800 shadow-card ring-1 ring-slate-200/80",
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
                    "flex items-center gap-1.5 text-xs font-medium",
                    outbound ? "text-white/85" : "text-slate-500",
                  )}
                >
                  <Mic className="h-3 w-3 animate-pulse" aria-hidden />
                  Transcrevendo áudio…
                </div>
              )}
            </div>
          ) : (
            <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</p>
          )}
        </div>

        {/* Meta — only on group end */}
        {isGroupEnd && (
          <div className="mt-1 flex items-center gap-1.5 px-1">
            <time
              dateTime={message.createdAt}
              className="text-2xs font-medium text-slate-400"
            >
              {formatTime(message.createdAt)}
            </time>
            {outbound && (
              <span className="inline-flex">
                <StatusIcon status={message.status} />
              </span>
            )}
            {message.reaction && (
              <span className="rounded-full border border-white bg-white px-1.5 py-0.5 text-2xs shadow-card ring-1 ring-slate-200">
                {message.reaction}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Bot avatar — only on group end */}
      {outbound && (
        <div className="w-8 shrink-0">
          {isGroupEnd ? (
            <div className="mt-auto flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-brand-100 to-accent-100 text-brand-700 ring-1 ring-brand-200/60 shadow-card">
              <Bot className="h-4 w-4" aria-hidden />
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};

export default MessageBubble;
