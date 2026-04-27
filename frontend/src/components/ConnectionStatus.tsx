import { CheckCircle2, Loader2, QrCode, WifiOff } from "lucide-react";
import clsx from "clsx";
import type { ConnectionStatus as Status } from "../lib/types";

interface Props {
  status: Status;
  qr?: string | null;
}

const config: Record<
  Status,
  { label: string; dot: string; ring: string; icon: typeof CheckCircle2 }
> = {
  connected: {
    label: "WhatsApp conectado",
    dot: "bg-brand-500",
    ring: "ring-brand-200",
    icon: CheckCircle2,
  },
  connecting: {
    label: "Conectando…",
    dot: "bg-amber-400",
    ring: "ring-amber-200",
    icon: Loader2,
  },
  qr: {
    label: "Escaneie o QR Code",
    dot: "bg-blue-500",
    ring: "ring-blue-200",
    icon: QrCode,
  },
  disconnected: {
    label: "Desconectado",
    dot: "bg-rose-500",
    ring: "ring-rose-200",
    icon: WifiOff,
  },
};

export const ConnectionPill = ({ status }: { status: Status }) => {
  const cfg = config[status];
  const Icon = cfg.icon;
  return (
    <div
      className={clsx(
        "flex items-center gap-2 rounded-full bg-white px-3 py-1.5 ring-1",
        cfg.ring,
      )}
    >
      <span className="relative flex h-2 w-2">
        <span
          className={clsx(
            "absolute inline-flex h-full w-full rounded-full opacity-75 animate-pulse-slow",
            cfg.dot,
          )}
        />
        <span className={clsx("relative inline-flex h-2 w-2 rounded-full", cfg.dot)} />
      </span>
      <Icon className={clsx("h-3.5 w-3.5 text-slate-500", status === "connecting" && "animate-spin")} />
      <span className="text-xs font-medium text-slate-700">{cfg.label}</span>
    </div>
  );
};

export const QRPanel = ({ qr }: { qr: string | null | undefined }) => {
  if (!qr) return null;
  return (
    <div className="rounded-2xl bg-white p-6 shadow-card-lg ring-1 ring-slate-200">
      <div className="mb-3 flex items-center gap-2">
        <QrCode className="h-4 w-4 text-slate-500" />
        <h3 className="text-sm font-semibold text-slate-800">Conecte o WhatsApp</h3>
      </div>
      <p className="mb-4 text-xs text-slate-500">
        Abra o WhatsApp no celular → <strong>Aparelhos conectados</strong> → toque em{" "}
        <strong>Conectar um aparelho</strong> e escaneie o QR abaixo.
      </p>
      <img
        src={qr}
        alt="QR Code de conexão do WhatsApp"
        className="mx-auto h-64 w-64 rounded-xl border border-slate-200 bg-white p-2"
      />
    </div>
  );
};

export default ConnectionPill;
