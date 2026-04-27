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
  <div className="flex items-start gap-3 px-1 py-2">
    <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
      <Icon className="h-3.5 w-3.5" />
    </div>
    <div className="min-w-0 flex-1">
      <div className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{label}</div>
      <div
        className={clsx(
          "truncate text-sm",
          value ? "font-medium text-slate-800" : "italic text-slate-400",
        )}
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
        return "bg-brand-100 text-brand-800 ring-brand-200";
      case "needs_human":
        return "bg-amber-100 text-amber-800 ring-amber-200";
      case "opt_out":
        return "bg-rose-100 text-rose-700 ring-rose-200";
      case "new":
        return "bg-blue-100 text-blue-700 ring-blue-200";
      default:
        return "bg-slate-100 text-slate-600 ring-slate-200";
    }
  })();
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ring-1",
        cls,
      )}
    >
      {statusLabel(status)}
    </span>
  );
};

export const LeadPanel = ({ conversation }: Props) => {
  const lead = conversation?.lead;

  return (
    <div className="flex h-full flex-col bg-white">
      <div className="flex items-center gap-2 border-b border-slate-200 px-5 py-4">
        <Contact className="h-4 w-4 text-slate-500" />
        <h2 className="text-sm font-semibold text-slate-800">Lead</h2>
      </div>

      {!conversation ? (
        <div className="flex flex-1 items-center justify-center px-6 text-center text-xs text-slate-400">
          Selecione uma conversa para ver os dados do lead.
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto px-5 py-5">
          <div className="mb-5">
            <div className="mb-1 text-[11px] font-medium uppercase tracking-wide text-slate-400">
              Status do lead
            </div>
            <StatusBadge status={lead?.status || "new"} />
          </div>

          <div className="mb-5 rounded-xl bg-gradient-to-br from-brand-50 to-blue-50 p-3 ring-1 ring-brand-100">
            <div className="mb-1 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-brand-700">
              <Sparkles className="h-3 w-3" />
              Intenção detectada
            </div>
            <div
              className={clsx(
                "text-sm font-semibold",
                conversation.intent ? "text-slate-800" : "italic text-slate-400",
              )}
            >
              {conversation.intent ? intentLabel(conversation.intent) : "Aguardando classificação…"}
            </div>
          </div>

          <div className="space-y-1">
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

          <div className="mt-6 rounded-xl bg-slate-50 p-3 text-[11px] leading-relaxed text-slate-500 ring-1 ring-slate-200">
            <strong className="text-slate-700">Como os dados são preenchidos:</strong> a IA extrai
            automaticamente nome, empresa, interesse, objetivo e volume conforme a conversa avança.
            O status muda para <em>qualified</em> quando há fit comercial, <em>needs_human</em> ao
            pedir consultor e <em>opt_out</em> em caso de desinteresse.
          </div>
        </div>
      )}
    </div>
  );
};

export default LeadPanel;
