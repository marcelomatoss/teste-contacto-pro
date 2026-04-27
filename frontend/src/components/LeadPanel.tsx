import {
  Building2,
  Contact,
  Phone,
  Sparkles,
  Target,
  TrendingUp,
  UserCircle,
} from "lucide-react";
import clsx from "clsx";
import { useEffect, useRef, useState } from "react";
import type { Conversation } from "../lib/types";
import { formatJid, intentLabel, statusLabel } from "../lib/format";

interface Props {
  conversation: Conversation | null;
}

const InfoRow = ({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof UserCircle;
  label: string;
  value: string | null | undefined;
}) => (
  <div className="group flex items-start gap-3 rounded-lg px-2 py-2 transition-colors duration-base hover:bg-slate-50">
    <div
      className={clsx(
        "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ring-1 transition-colors duration-base",
        value
          ? "bg-brand-50 text-brand-600 ring-brand-100 group-hover:bg-brand-100"
          : "bg-slate-100 text-slate-400 ring-slate-200",
      )}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden />
    </div>
    <div className="min-w-0 flex-1">
      <div className="text-2xs font-bold uppercase tracking-wider text-slate-400">
        {label}
      </div>
      <div
        className={clsx(
          "mt-0.5 truncate text-sm",
          value ? "font-semibold text-slate-800" : "italic text-slate-400",
        )}
        title={value || undefined}
      >
        {value || "—"}
      </div>
    </div>
  </div>
);

const StatusBadge = ({ status }: { status: string | null | undefined }) => {
  const cls = (() => {
    switch (status) {
      case "qualified":
        return "bg-accent-100 text-accent-800 ring-accent-200";
      case "needs_human":
        return "bg-amber-100 text-amber-800 ring-amber-200";
      case "opt_out":
        return "bg-rose-100 text-rose-700 ring-rose-200";
      case "new":
        return "bg-brand-100 text-brand-800 ring-brand-200";
      default:
        return "bg-slate-100 text-slate-600 ring-slate-200";
    }
  })();
  const dot = (() => {
    switch (status) {
      case "qualified":
        return "bg-accent-500";
      case "needs_human":
        return "bg-amber-500";
      case "opt_out":
        return "bg-rose-500";
      case "new":
        return "bg-brand-500";
      default:
        return "bg-slate-400";
    }
  })();
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-2xs font-bold uppercase tracking-wider ring-1",
        cls,
      )}
    >
      <span aria-hidden className={clsx("h-1.5 w-1.5 rounded-full", dot)} />
      {statusLabel(status)}
    </span>
  );
};

const completeness = (lead: Conversation["lead"]): number => {
  if (!lead) return 0;
  const fields = [
    lead.name,
    lead.company,
    lead.serviceInterest,
    lead.leadGoal,
    lead.estimatedVolume,
  ];
  const filled = fields.filter(Boolean).length;
  return Math.round((filled / fields.length) * 100);
};

export const LeadPanel = ({ conversation }: Props) => {
  const lead = conversation?.lead;
  const pct = completeness(lead);
  const intent = conversation?.intent;

  // Highlight intent on change
  const lastIntentRef = useRef<string | null>(null);
  const [intentHighlight, setIntentHighlight] = useState(false);
  useEffect(() => {
    if (intent && intent !== lastIntentRef.current) {
      lastIntentRef.current = intent;
      setIntentHighlight(true);
      const t = setTimeout(() => setIntentHighlight(false), 1400);
      return () => clearTimeout(t);
    }
  }, [intent]);

  return (
    <div className="flex h-full flex-col bg-white/60 backdrop-blur" aria-label="Painel do lead">
      <div className="flex items-center justify-between border-b border-slate-200/70 px-5 py-4">
        <div className="flex items-center gap-2">
          <Contact className="h-4 w-4 text-brand-600" aria-hidden />
          <h2 className="font-heading text-sm font-bold text-slate-800">Lead</h2>
        </div>
        {conversation && (
          <span className="text-2xs font-bold uppercase tracking-wider text-slate-400">
            {pct}% completo
          </span>
        )}
      </div>

      {!conversation ? (
        <div className="flex flex-1 items-center justify-center px-6 text-center text-xs text-slate-400">
          Selecione uma conversa para ver os dados do lead.
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto px-5 py-5">
          {/* Status */}
          <div className="mb-4">
            <div className="mb-1.5 text-2xs font-bold uppercase tracking-wider text-slate-400">
              Status
            </div>
            <StatusBadge status={lead?.status || "new"} />
          </div>

          {/* Completeness bar */}
          <div className="mb-5">
            <div className="mb-1.5 flex items-center justify-between text-2xs">
              <span className="font-semibold text-slate-600">Qualificação</span>
              <span className="font-bold text-slate-800">{pct}%</span>
            </div>
            <div
              role="progressbar"
              aria-valuenow={pct}
              aria-valuemin={0}
              aria-valuemax={100}
              className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100"
            >
              <div
                className={clsx(
                  "h-full rounded-full transition-all duration-slow ease-out-expo",
                  pct >= 80
                    ? "bg-gradient-to-r from-accent-500 to-accent-600"
                    : pct >= 40
                      ? "bg-gradient-to-r from-brand-400 to-brand-600"
                      : "bg-gradient-to-r from-slate-300 to-slate-400",
                )}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>

          {/* Intent */}
          <div
            className={clsx(
              "mb-5 rounded-xl p-4 ring-1 transition-colors duration-base",
              "bg-gradient-to-br from-brand-50 via-brand-50 to-accent-50 ring-brand-100",
              intentHighlight && "animate-highlight",
            )}
          >
            <div className="mb-1 flex items-center gap-1.5 text-2xs font-bold uppercase tracking-wider text-brand-700">
              <Sparkles className="h-3 w-3" aria-hidden />
              Intenção detectada
            </div>
            <div
              className={clsx(
                "font-heading text-base font-bold",
                intent ? "text-slate-900" : "italic text-slate-400",
              )}
            >
              {intent ? intentLabel(intent) : "Aguardando classificação…"}
            </div>
          </div>

          {/* Lead data */}
          <div className="mb-2 px-2 text-2xs font-bold uppercase tracking-wider text-slate-400">
            Dados extraídos pela IA
          </div>
          <div className="space-y-0.5">
            <InfoRow icon={UserCircle} label="Nome" value={lead?.name} />
            <InfoRow icon={Building2} label="Empresa" value={lead?.company} />
            <InfoRow
              icon={Phone}
              label="Telefone"
              value={lead?.phone ? formatJid(`${lead.phone}@s.whatsapp.net`) : null}
            />
            <InfoRow
              icon={Sparkles}
              label="Interesse em serviço"
              value={lead?.serviceInterest ? intentLabel(lead.serviceInterest) : null}
            />
            <InfoRow icon={Target} label="Objetivo" value={lead?.leadGoal} />
            <InfoRow
              icon={TrendingUp}
              label="Volume estimado"
              value={lead?.estimatedVolume}
            />
          </div>

          <div className="mt-6 rounded-xl bg-slate-50/80 p-3.5 text-2xs leading-relaxed text-slate-500 ring-1 ring-slate-200/60">
            <strong className="text-slate-700">Como os dados são preenchidos:</strong> a IA
            extrai automaticamente nome, empresa, interesse, objetivo e volume conforme a
            conversa avança. O status muda para{" "}
            <em className="font-bold not-italic text-accent-700">qualified</em> quando há fit
            comercial,{" "}
            <em className="font-bold not-italic text-amber-700">needs_human</em> ao pedir
            consultor e <em className="font-bold not-italic text-rose-700">opt_out</em> em
            caso de desinteresse.
          </div>
        </div>
      )}
    </div>
  );
};

export default LeadPanel;
