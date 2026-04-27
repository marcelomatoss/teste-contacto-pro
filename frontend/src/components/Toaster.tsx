import { AlertTriangle, X } from "lucide-react";

interface Props {
  errors: { id: string; message: string }[];
  onDismiss?: (id: string) => void;
}

export const Toaster = ({ errors, onDismiss }: Props) => {
  if (errors.length === 0) return null;
  return (
    <div className="pointer-events-none fixed right-6 top-20 z-50 flex w-full max-w-sm flex-col gap-2">
      {errors.map((e) => (
        <div
          key={e.id}
          role="alert"
          className="pointer-events-auto flex animate-slide-up items-start gap-2.5 rounded-xl bg-white/95 px-4 py-3 shadow-card-lg ring-1 ring-rose-200 backdrop-blur"
        >
          <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-600">
            <AlertTriangle className="h-3.5 w-3.5" />
          </div>
          <p className="flex-1 text-xs font-semibold leading-relaxed text-rose-800">
            {e.message}
          </p>
          {onDismiss && (
            <button
              onClick={() => onDismiss(e.id)}
              className="press shrink-0 rounded-md p-0.5 text-rose-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
              aria-label="Fechar notificação"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      ))}
    </div>
  );
};

export default Toaster;
