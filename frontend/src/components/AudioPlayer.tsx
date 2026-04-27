import { Mic } from "lucide-react";
import { api } from "../lib/api";

interface Props {
  messageId: string;
  outbound?: boolean;
}

export const AudioPlayer = ({ messageId, outbound = false }: Props) => {
  return (
    <div
      className={`flex items-center gap-2 rounded-xl px-3 py-2 ${
        outbound ? "bg-brand-700/40" : "bg-slate-200/70"
      }`}
    >
      <Mic className={`h-4 w-4 ${outbound ? "text-white/90" : "text-slate-600"}`} />
      <audio controls preload="metadata" className="h-8 max-w-[220px]">
        <source src={api.mediaUrl(messageId)} type="audio/ogg" />
        Seu navegador não suporta áudio.
      </audio>
    </div>
  );
};

export default AudioPlayer;
