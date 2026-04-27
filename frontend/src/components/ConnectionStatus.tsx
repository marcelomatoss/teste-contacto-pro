import { CheckCircle2, Loader2, QrCode, ShieldCheck, Smartphone, WifiOff } from "lucide-react";
import clsx from "clsx";
import type { ConnectionStatus as Status } from "../lib/types";

interface Props {
  status: Status;
  qr?: string | null;
}

const config: Record<
  Status,
  { label: string; dot: string; ring: string; bg: string; icon: typeof CheckCircle2; iconClass: string }
> = {
  connected: {
    label: "WhatsApp conectado",
    dot: "bg-accent-500",
    ring: "ring-accent-200",
    bg: "bg-accent-50",
    icon: CheckCircle2,
    iconClass: "text-accent-600",
  },
  connecting: {
    label: "Conectando…",
    dot: "bg-amber-400",
    ring: "ring-amber-200",
    bg: "bg-amber-50",
    icon: Loader2,
    iconClass: "text-amber-600 animate-spin",
  },
  qr: {
    label: "Escaneie o QR Code",
    dot: "bg-brand-500",
    ring: "ring-brand-200",
    bg: "bg-brand-50",
    icon: QrCode,
    iconClass: "text-brand-600",
  },
  disconnected: {
    label: "Desconectado",
    dot: "bg-rose-500",
    ring: "ring-rose-200",
    bg: "bg-rose-50",
    icon: WifiOff,
    iconClass: "text-rose-600",
  },
};

export const ConnectionPill = ({ status }: { status: Status }) => {
  const cfg = config[status];
  const Icon = cfg.icon;
  return (
    <div
      className={clsx(
        "flex items-center gap-2 rounded-full px-3 py-1.5 ring-1 transition-all duration-200",
        cfg.bg,
        cfg.ring,
      )}
    >
      <span className="relative flex h-2 w-2">
        <span
          className={clsx(
            "absolute inline-flex h-full w-full rounded-full opacity-70 animate-pulse-slow",
            cfg.dot,
          )}
        />
        <span className={clsx("relative inline-flex h-2 w-2 rounded-full", cfg.dot)} />
      </span>
      <Icon className={clsx("h-3.5 w-3.5", cfg.iconClass)} />
      <span className="text-xs font-semibold text-slate-700">{cfg.label}</span>
    </div>
  );
};

export const QRPanel = ({ qr }: { qr: string | null | undefined }) => {
  if (!qr) return null;
  return (
    <div className="glass animate-slide-up rounded-2xl p-6 ring-1 ring-slate-200/70">
      <div className="grid items-center gap-6 md:grid-cols-[auto_1fr]">
        <div className="relative mx-auto md:mx-0">
          <div className="absolute inset-0 -z-10 rounded-2xl bg-gradient-to-br from-brand-100 to-accent-100 blur-2xl opacity-60" />
          <img
            src={qr}
            alt="QR Code de conexão do WhatsApp"
            className="h-56 w-56 rounded-xl border border-slate-200 bg-white p-2 shadow-card-lg"
          />
        </div>
        <div>
          <div className="mb-1 inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-2.5 py-1 text-[11px] font-semibold text-brand-700 ring-1 ring-brand-200">
            <QrCode className="h-3 w-3" />
            Pareamento pendente
          </div>
          <h3 className="font-heading text-lg font-bold tracking-tight text-slate-900">
            Conecte o WhatsApp em 3 passos
          </h3>
          <ol className="mt-3 space-y-2.5 text-sm text-slate-600">
            <li className="flex items-start gap-2.5">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-100 text-[11px] font-bold text-brand-700">
                1
              </span>
              <span>
                Abra o <strong>WhatsApp</strong> no celular
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-100 text-[11px] font-bold text-brand-700">
                2
              </span>
              <span>
                Vá em <strong>Aparelhos conectados</strong> →{" "}
                <strong>Conectar um aparelho</strong>
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-100 text-[11px] font-bold text-brand-700">
                3
              </span>
              <span>Escaneie o QR ao lado pela câmera do WhatsApp</span>
            </li>
          </ol>
          <div className="mt-4 flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
            <span className="inline-flex items-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5 text-accent-600" />
              Sessão local, sem servidores externos
            </span>
            <span className="inline-flex items-center gap-1">
              <Smartphone className="h-3.5 w-3.5 text-slate-400" />
              Funciona com WhatsApp pessoal ou Business
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConnectionPill;
