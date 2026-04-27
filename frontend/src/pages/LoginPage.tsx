import { useState, type FormEvent } from "react";
import { Loader2, LogIn, ShieldCheck } from "lucide-react";
import clsx from "clsx";
import BrandMark from "../components/BrandMark";
import { useAuth } from "../hooks/useAuth";

export const LoginPage = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState("admin@contactpro.local");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await login(email.trim(), password);
    } catch (err) {
      setError((err as Error).message || "Falha no login");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Brand */}
        <div className="mb-8 flex items-center justify-center gap-3">
          <BrandMark size={48} />
          <div>
            <h1 className="font-heading text-xl font-bold tracking-tight text-slate-900">
              Contact Pro <span className="text-brand-600">Inbox</span>
            </h1>
            <p className="text-2xs font-medium text-slate-500">
              Atendimento de leads via WhatsApp · IA em tempo real
            </p>
          </div>
        </div>

        {/* Card */}
        <form
          onSubmit={onSubmit}
          className="glass-strong animate-slide-up space-y-4 rounded-2xl p-6 ring-1 ring-slate-200/70"
          aria-label="Formulário de login"
        >
          <div>
            <h2 className="font-heading text-lg font-bold text-slate-900">Entrar</h2>
            <p className="mt-1 text-xs text-slate-500">
              Use suas credenciais do workspace para acessar a inbox.
            </p>
          </div>

          <label className="block">
            <span className="mb-1 block text-2xs font-bold uppercase tracking-wider text-slate-500">
              Email
            </span>
            <input
              type="email"
              required
              autoFocus
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="ring-focus w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 transition-colors duration-base focus:border-brand-400"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-2xs font-bold uppercase tracking-wider text-slate-500">
              Senha
            </span>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="ring-focus w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 transition-colors duration-base focus:border-brand-400"
            />
          </label>

          {error && (
            <div
              role="alert"
              className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 ring-1 ring-rose-200"
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !password}
            className={clsx(
              "press ring-focus inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-bold text-white transition-colors",
              "bg-gradient-to-br from-brand-600 to-brand-700 hover:from-brand-500 hover:to-brand-700 disabled:opacity-50",
            )}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <LogIn className="h-4 w-4" />
            )}
            {loading ? "Entrando…" : "Entrar"}
          </button>

          <div className="flex items-center justify-center gap-1.5 pt-1 text-2xs text-slate-400">
            <ShieldCheck className="h-3 w-3 text-accent-600" aria-hidden />
            Conexão protegida · sessão JWT
          </div>
        </form>

        <p className="mt-6 text-center text-2xs text-slate-400">
          Primeira vez? Use as credenciais geradas no <code>.env</code> (admin
          padrão: <code>admin@contactpro.local</code>).
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
