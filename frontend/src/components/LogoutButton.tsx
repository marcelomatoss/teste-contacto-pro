import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, Loader2, LogOut, X } from "lucide-react";
import clsx from "clsx";
import { api } from "../lib/api";
import type { ConnectionStatus } from "../lib/types";

interface Props {
  status: ConnectionStatus;
}

export const LogoutButton = ({ status }: Props) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  const canDisconnect = status === "connected" || status === "qr";

  // Close on escape + lock body scroll while modal is open
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !loading) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, loading]);

  const confirm = async () => {
    setLoading(true);
    setError(null);
    try {
      await api.whatsappLogout();
      // Realtime layer will switch the connection state to 'disconnected'
      // and then 'qr' once Baileys re-pairs. Just close the dialog.
      setOpen(false);
    } catch (err) {
      setError((err as Error).message || "Falha ao desconectar");
    } finally {
      setLoading(false);
    }
  };

  if (!canDisconnect) return null;

  // The dialog is rendered via Portal directly into <body> so it escapes any
  // ancestor with `backdrop-filter` / `transform` (which would otherwise
  // create a containing block and trap our `position: fixed` modal inside
  // the TopBar). This also ensures the scrim blur covers the whole viewport.
  const dialog = open
    ? createPortal(
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="logout-title"
          className="fixed inset-0 z-modal flex items-center justify-center px-4 animate-fade-in"
        >
          {/* Scrim — full-viewport blur + dim */}
          <button
            type="button"
            className="absolute inset-0 bg-slate-900/55 backdrop-blur-md"
            onClick={() => !loading && setOpen(false)}
            aria-label="Fechar"
            tabIndex={-1}
          />
          {/* Dialog */}
          <div
            ref={dialogRef}
            className="relative w-full max-w-md animate-slide-up rounded-2xl bg-white p-6 shadow-card-lg ring-1 ring-slate-200"
          >
            <button
              onClick={() => !loading && setOpen(false)}
              disabled={loading}
              className="press absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50"
              aria-label="Fechar"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-amber-100 ring-1 ring-amber-200">
              <AlertTriangle className="h-5 w-5 text-amber-600" aria-hidden />
            </div>

            <h2
              id="logout-title"
              className="font-heading text-lg font-bold tracking-tight text-slate-900"
            >
              Desconectar o WhatsApp?
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
              A sessão atual será encerrada e a sessão local apagada. Para voltar a usar o
              bot, você precisará escanear um novo QR Code.
            </p>
            <p className="mt-2 text-xs text-slate-500">
              O histórico de conversas, mensagens e leads no banco{" "}
              <strong>permanece intacto</strong>.
            </p>

            {error && (
              <div className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 ring-1 ring-rose-200">
                {error}
              </div>
            )}

            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                onClick={() => setOpen(false)}
                disabled={loading}
                className={clsx(
                  "press ring-focus rounded-lg px-4 py-2 text-sm font-semibold text-slate-700 transition-colors",
                  "bg-slate-100 hover:bg-slate-200 disabled:opacity-50",
                )}
              >
                Cancelar
              </button>
              <button
                onClick={confirm}
                disabled={loading}
                className={clsx(
                  "press ring-focus inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors",
                  "bg-rose-600 hover:bg-rose-700 disabled:opacity-50",
                )}
              >
                {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />}
                {loading ? "Desconectando…" : "Desconectar"}
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )
    : null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="press ring-focus group flex h-7 w-7 items-center justify-center rounded-full bg-white/0 text-slate-400 transition-colors duration-base hover:bg-rose-50 hover:text-rose-600"
        title="Desconectar WhatsApp"
        aria-label="Desconectar WhatsApp"
      >
        <LogOut className="h-3.5 w-3.5" aria-hidden />
      </button>
      {dialog}
    </>
  );
};

export default LogoutButton;
