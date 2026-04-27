import { useEffect, useRef, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, Loader2, Mail, UserPlus, X } from "lucide-react";
import clsx from "clsx";
import { api } from "../lib/api";
import { useAuth } from "../hooks/useAuth";

interface Props {
  open: boolean;
  onClose: () => void;
}

interface FormState {
  email: string;
  name: string;
  password: string;
}

const initialForm: FormState = { email: "", name: "", password: "" };

export const InviteUserModal = ({ open, onClose }: Props) => {
  const { user } = useAuth();
  const [form, setForm] = useState<FormState>(initialForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ email: string; name: string | null } | null>(null);
  const firstFieldRef = useRef<HTMLInputElement>(null);

  // Reset form state only when the modal transitions from closed → open.
  // (Earlier this effect also depended on `loading`, which made it re-run
  //  after every submit and clobber `created` immediately, hiding the
  //  success state we had just rendered.)
  useEffect(() => {
    if (!open) return;
    setForm(initialForm);
    setError(null);
    setCreated(null);
    const t = setTimeout(() => firstFieldRef.current?.focus(), 30);
    return () => clearTimeout(t);
  }, [open]);

  // Keyboard + body-scroll lock — re-binds on loading change to capture the
  // current loading value in the Escape handler closure.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !loading) onClose();
    };
    document.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, loading, onClose]);

  if (!open || !user) return null;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (form.password.length < 8) {
      setError("A senha precisa ter pelo menos 8 caracteres.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { user: invited } = await api.registerUser({
        email: form.email.trim().toLowerCase(),
        password: form.password,
        name: form.name.trim() || undefined,
        workspaceSlug: user.workspace.slug,
      });
      setCreated({ email: invited.email, name: invited.name });
    } catch (err) {
      setError((err as Error).message || "Falha ao convidar usuário");
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="invite-title"
      className="fixed inset-0 z-modal flex items-center justify-center px-4 animate-fade-in"
    >
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/55 backdrop-blur-md"
        onClick={() => !loading && onClose()}
        aria-label="Fechar"
        tabIndex={-1}
      />

      <div className="relative w-full max-w-md animate-slide-up rounded-2xl bg-white p-6 shadow-card-lg ring-1 ring-slate-200">
        <button
          onClick={() => !loading && onClose()}
          disabled={loading}
          className="press absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50"
          aria-label="Fechar"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-brand-100 ring-1 ring-brand-200">
          <UserPlus className="h-5 w-5 text-brand-700" aria-hidden />
        </div>

        <h2 id="invite-title" className="font-heading text-lg font-bold tracking-tight text-slate-900">
          Convidar usuário
        </h2>
        <p className="mt-1 text-sm leading-relaxed text-slate-600">
          Adicione uma pessoa ao workspace{" "}
          <strong className="text-slate-900">{user.workspace.name}</strong>. O usuário
          poderá fazer login e ver as mesmas conversas que você.
        </p>

        {created ? (
          <SuccessState invited={created} onDone={onClose} />
        ) : (
          <form onSubmit={submit} className="mt-5 space-y-3">
            <Field
              label="Email"
              required
              type="email"
              autoComplete="email"
              inputRef={firstFieldRef}
              value={form.email}
              onChange={(v) => setForm((f) => ({ ...f, email: v }))}
              placeholder="maria@empresa.com"
            />
            <Field
              label="Nome (opcional)"
              type="text"
              autoComplete="name"
              value={form.name}
              onChange={(v) => setForm((f) => ({ ...f, name: v }))}
              placeholder="Maria Silva"
            />
            <Field
              label="Senha temporária"
              required
              type="password"
              autoComplete="new-password"
              value={form.password}
              onChange={(v) => setForm((f) => ({ ...f, password: v }))}
              hint="Mínimo 8 caracteres. A pessoa convidada poderá trocar depois."
            />

            {error && (
              <div
                role="alert"
                className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 ring-1 ring-rose-200"
              >
                {error}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="press ring-focus rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-200 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading || !form.email || !form.password}
                className={clsx(
                  "press ring-focus inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold text-white transition-colors",
                  "bg-gradient-to-br from-brand-600 to-brand-700 hover:from-brand-500 hover:to-brand-700 disabled:opacity-50",
                )}
              >
                {loading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Mail className="h-3.5 w-3.5" />
                )}
                {loading ? "Criando…" : "Criar usuário"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>,
    document.body,
  );
};

interface FieldProps {
  label: string;
  type: string;
  required?: boolean;
  autoComplete?: string;
  value: string;
  placeholder?: string;
  hint?: string;
  inputRef?: React.RefObject<HTMLInputElement>;
  onChange: (v: string) => void;
}

const Field = ({
  label,
  type,
  required,
  autoComplete,
  value,
  placeholder,
  hint,
  inputRef,
  onChange,
}: FieldProps) => (
  <label className="block">
    <span className="mb-1 block text-2xs font-bold uppercase tracking-wider text-slate-500">
      {label}
    </span>
    <input
      ref={inputRef}
      required={required}
      type={type}
      autoComplete={autoComplete}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className="ring-focus w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 transition-colors duration-base focus:border-brand-400"
    />
    {hint && <span className="mt-1 block text-2xs text-slate-400">{hint}</span>}
  </label>
);

const SuccessState = ({
  invited,
  onDone,
}: {
  invited: { email: string; name: string | null };
  onDone: () => void;
}) => (
  <div className="mt-5 space-y-4">
    <div className="flex items-start gap-3 rounded-xl bg-accent-50 p-4 ring-1 ring-accent-200">
      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-100 text-accent-700">
        <CheckCircle2 className="h-4 w-4" aria-hidden />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-heading text-sm font-bold text-accent-900">Usuário criado</p>
        <p className="mt-0.5 break-all text-xs text-accent-800">
          <strong>{invited.name || invited.email}</strong>
          {invited.name && <span> · {invited.email}</span>}
        </p>
        <p className="mt-2 text-2xs text-accent-700">
          Compartilhe a senha temporária diretamente com a pessoa. Ela poderá entrar
          imediatamente em <code className="rounded bg-white/60 px-1">/login</code>.
        </p>
      </div>
    </div>
    <button
      type="button"
      onClick={onDone}
      className="press ring-focus w-full rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-200"
    >
      Fechar
    </button>
  </div>
);

export default InviteUserModal;
