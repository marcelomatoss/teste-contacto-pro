import { Brain, ChevronRight, Mic, Volume2 } from "lucide-react";
import clsx from "clsx";
import { ConnectionPill } from "./ConnectionStatus";
import BrandMark from "./BrandMark";
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
      "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-2xs font-bold uppercase tracking-wider ring-1 transition-colors duration-fast",
      enabled
        ? "bg-accent-50 text-accent-700 ring-accent-200"
        : "bg-slate-100 text-slate-400 ring-slate-200",
    )}
    aria-label={`${label}: ${enabled ? "configurado" : "não configurado"}`}
  >
    <Icon className="h-3 w-3" />
    {label}
    <span
      aria-hidden
      className={clsx(
        "ml-0.5 inline-block h-1.5 w-1.5 rounded-full",
        enabled ? "bg-accent-500" : "bg-slate-400",
      )}
    />
  </div>
);

export const TopBar = ({ status, services }: Props) => {
  return (
    <header
      className="glass sticky top-0 z-sticky flex items-center justify-between gap-4 border-b border-slate-200/60 px-6 py-3.5"
      role="banner"
    >
      {/* Brand */}
      <div className="flex items-center gap-3">
        <BrandMark size={40} online={status === "connected"} />
        <div className="leading-tight">
          <h1 className="font-heading text-[15px] font-bold tracking-tight text-slate-900">
            Contact Pro <span className="text-brand-600">Inbox</span>
          </h1>
          <nav
            aria-label="Breadcrumbs"
            className="mt-0.5 flex items-center gap-1 text-2xs font-medium text-slate-500"
          >
            <span>Operações</span>
            <ChevronRight className="h-3 w-3 text-slate-300" />
            <span className="text-slate-700">WhatsApp · Atendimento</span>
          </nav>
        </div>
      </div>

      {/* Right: services + connection */}
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
