import { Mic } from "lucide-react";
import { api } from "../lib/api";
import clsx from "clsx";

interface Props {
  messageId: string;
  outbound?: boolean;
}

export const AudioPlayer = ({ messageId, outbound = false }: Props) => {
  return (
    <div
      className={clsx(
        "flex items-center gap-2 rounded-xl px-3 py-2 transition-colors",
        outbound ? "bg-brand-700/45" : "bg-slate-200/70",
      )}
    >
      <Mic className={clsx("h-4 w-4 shrink-0", outbound ? "text-white/90" : "text-brand-600")} />
      <audio
        controls
        preload="metadata"
        className="h-8 max-w-[220px] [&::-webkit-media-controls-panel]:bg-transparent"
      >
        <source src={api.mediaUrl(messageId)} type="audio/ogg" />
        <track kind="captions" />
        Seu navegador não suporta áudio.
      </audio>
    </div>
  );
};

export default AudioPlayer;
