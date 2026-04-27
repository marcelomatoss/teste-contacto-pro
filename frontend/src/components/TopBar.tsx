import { Bot, Brain, Mic, Volume2 } from "lucide-react";
import clsx from "clsx";
import { ConnectionPill } from "./ConnectionStatus";
import type { ConnectionStatus } from "../lib/types";

interface Props {
  status: ConnectionStatus;
  services: { ai: boolean; stt: boolean; tts: boolean };
}

const ServicePill = ({
  enabled,
  label,
  icon: Icon,
}: {
  enabled: boolean;
  label: string;
  icon: typeof Brain;
}) => (
  <div
    className={clsx(
      "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ring-1",
      enabled
        ? "bg-brand-50 text-brand-700 ring-brand-200"
        : "bg-slate-100 text-slate-500 ring-slate-200",
    )}
    title={enabled ? `${label}: configurado` : `${label}: não configurado`}
  >
    <Icon className="h-3 w-3" />
    {label}
  </div>
);

export const TopBar = ({ status, services }: Props) => {
  return (
    <header className="flex items-center justify-between border-b border-slate-200 bg-white/70 px-6 py-3 backdrop-blur">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-card">
          <Bot className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-sm font-semibold tracking-tight text-slate-900">
            Contact Pro <span className="text-brand-600">Inbox</span>
          </h1>
          <p className="text-[11px] text-slate-500">
            Atendimento de leads via WhatsApp com IA em tempo real
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <ServicePill enabled={services.ai} label="LLM" icon={Brain} />
        <ServicePill enabled={services.stt} label="STT" icon={Mic} />
        <ServicePill enabled={services.tts} label="TTS" icon={Volume2} />
        <div className="ml-2">
          <ConnectionPill status={status} />
        </div>
      </div>
    </header>
  );
};

export default TopBar;
