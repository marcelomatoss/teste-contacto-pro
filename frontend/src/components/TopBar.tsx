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
      "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 transition-colors",
      enabled
        ? "bg-accent-50 text-accent-700 ring-accent-200"
        : "bg-slate-100 text-slate-500 ring-slate-200",
    )}
    title={enabled ? `${label}: configurado` : `${label}: não configurado`}
  >
    <Icon className="h-3 w-3" />
    {label}
    <span
      className={clsx(
        "ml-0.5 inline-block h-1.5 w-1.5 rounded-full",
        enabled ? "bg-accent-500" : "bg-slate-400",
      )}
    />
  </div>
);

export const TopBar = ({ status, services }: Props) => {
  return (
    <header className="glass sticky top-0 z-40 flex items-center justify-between border-b border-slate-200/60 px-6 py-3.5">
      <div className="flex items-center gap-3">
        <div className="relative">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-card-lg ring-1 ring-brand-700/30">
            <Bot className="h-5 w-5" />
          </div>
          <span
            className={clsx(
              "absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full ring-2 ring-white transition-colors",
              status === "connected" ? "bg-accent-500" : status === "qr" ? "bg-brand-500" : "bg-slate-400",
            )}
          />
        </div>
        <div>
          <h1 className="font-heading text-[15px] font-bold tracking-tight text-slate-900">
            Contact Pro <span className="text-brand-600">Inbox</span>
          </h1>
          <p className="text-[11px] font-medium text-slate-500">
            Atendimento de leads via WhatsApp · IA em tempo real
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="hidden items-center gap-1.5 md:flex">
          <ServicePill enabled={services.ai} label="LLM" icon={Brain} />
          <ServicePill enabled={services.stt} label="STT" icon={Mic} />
          <ServicePill enabled={services.tts} label="TTS" icon={Volume2} />
        </div>
        <div className="ml-1">
          <ConnectionPill status={status} />
        </div>
      </div>
    </header>
  );
};

export default TopBar;
