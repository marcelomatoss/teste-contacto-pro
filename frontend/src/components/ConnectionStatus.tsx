import { CheckCircle2, Loader2, QrCode, ShieldCheck, Smartphone, WifiOff } from "lucide-react";
import clsx from "clsx";
import type { ConnectionStatus as Status } from "../lib/types";

interface Props {
  status: Status;
  qr?: string | null;
}

const config: Record<
  Status,
  {
    label: string;
    dot: string;
    ring: string;
    bg: string;
    icon: typeof CheckCircle2;
    iconClass: string;
  }
> = {
  connected: {
    label: "Conectado",
    dot: "bg-accent-500",
    ring: "ring-accent-200",
    bg: "bg-accent-50",
    icon: CheckCircle2,
    iconClass: "text-accent-600",
  },
  connecting: {
    label: "Conectando",
    dot: "bg-amber-400",
    ring: "ring-amber-200",
    bg: "bg-amber-50",
    icon: Loader2,
    iconClass: "text-amber-600 animate-spin",
  },
  qr: {
    label: "Aguardando QR",
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
      role="status"
      aria-live="polite"
      className={clsx(
        "flex items-center gap-2 rounded-full px-3 py-1.5 ring-1 transition-colors duration-base",
        cfg.bg,
        cfg.ring,
      )}
    >
      <span aria-hidden className="relative flex h-2 w-2">
        <span
          className={clsx(
            "absolute inline-flex h-full w-full rounded-full opacity-70 animate-pulse-slow",
            cfg.dot,
          )}
        />
        <span className={clsx("relative inline-flex h-2 w-2 rounded-full", cfg.dot)} />
      </span>
      <Icon className={clsx("h-3.5 w-3.5", cfg.iconClass)} aria-hidden />
      <span className="text-xs font-bold tracking-tight text-slate-700">{cfg.label}</span>
    </div>
  );
};

export const QRPanel = ({ qr }: { qr: string | null | undefined }) => {
  if (!qr) return null;
  return (
    <div
      className="glass-strong animate-slide-down rounded-2xl p-6 ring-1 ring-slate-200/70"
      role="dialog"
      aria-label="Pareamento do WhatsApp"
    >
      <div className="grid items-center gap-6 md:grid-cols-[auto_1fr]">
        {/* QR */}
        <div className="relative mx-auto md:mx-0">
          <div
            aria-hidden
            className="absolute inset-0 -z-10 rounded-2xl bg-gradient-to-br from-brand-200/60 to-accent-200/50 blur-2xl"
          />
          <div className="rounded-2xl bg-white p-3 shadow-card-lg ring-1 ring-slate-200">
            <img
              src={qr}
              alt="QR Code de conexão do WhatsApp"
              className="h-52 w-52 rounded-lg"
            />
          </div>
        </div>

        {/* Instructions */}
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-2.5 py-1 text-2xs font-bold uppercase tracking-wider text-brand-700 ring-1 ring-brand-200">
            <QrCode className="h-3 w-3" />
            Pareamento pendente
          </span>
          <h3 className="mt-3 font-heading text-2xl font-bold tracking-tight text-slate-900">
            Conecte o WhatsApp
          </h3>
          <p className="mt-1 text-sm text-slate-600">
            Use o leitor de QR de dentro do app, não a câmera padrão.
          </p>

          <ol className="mt-4 space-y-2.5">
            {[
              <>
                Abra o <strong>WhatsApp</strong> no celular
              </>,
              <>
                Vá em <strong>Aparelhos conectados</strong> →{" "}
                <strong>Conectar um aparelho</strong>
              </>,
              <>Escaneie o QR ao lado pela câmera do WhatsApp</>,
            ].map((step, i) => (
              <li key={i} className="flex items-start gap-3 text-sm text-slate-700">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-600 text-2xs font-bold text-white">
                  {i + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>

          <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-2xs text-slate-500">
            <span className="inline-flex items-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5 text-accent-600" />
              Sessão local, sem servidores externos
            </span>
            <span className="inline-flex items-center gap-1">
              <Smartphone className="h-3.5 w-3.5 text-slate-400" />
              WhatsApp pessoal ou Business
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConnectionPill;
