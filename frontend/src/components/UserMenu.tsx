import { useEffect, useRef, useState } from "react";
import { Building2, LogOut as LogOutIcon, User, UserPlus } from "lucide-react";
import clsx from "clsx";
import { useAuth } from "../hooks/useAuth";
import InviteUserModal from "./InviteUserModal";

const initialsOf = (name: string | null | undefined, email: string): string => {
  if (name) {
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return email.slice(0, 2).toUpperCase();
};

export const UserMenu = () => {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!user) return null;

  return (
    <>
      <div ref={ref} className="relative">
        <button
          onClick={() => setOpen((v) => !v)}
          className="press ring-focus flex items-center gap-2 rounded-full bg-white/80 px-2 py-1 ring-1 ring-slate-200 transition-colors hover:bg-white"
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label="Abrir menu do usuário"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-2xs font-bold text-white">
            {initialsOf(user.name, user.email)}
          </span>
          <span className="hidden text-2xs font-bold text-slate-700 sm:inline">
            {user.name || user.email.split("@")[0]}
          </span>
        </button>

        {open && (
          <div
            role="menu"
            className="animate-slide-down absolute right-0 z-overlay mt-2 w-64 origin-top-right overflow-hidden rounded-xl bg-white shadow-card-lg ring-1 ring-slate-200"
          >
            <div className="border-b border-slate-100 px-4 py-3">
              <div className="flex items-center gap-2">
                <User className="h-3.5 w-3.5 text-slate-400" aria-hidden />
                <span className="truncate text-sm font-semibold text-slate-800">
                  {user.name || user.email.split("@")[0]}
                </span>
              </div>
              <div className="mt-0.5 truncate text-2xs text-slate-500">{user.email}</div>
            </div>

            <div className="border-b border-slate-100 px-4 py-3">
              <div className="mb-1 flex items-center gap-2">
                <Building2 className="h-3.5 w-3.5 text-slate-400" aria-hidden />
                <span className="text-2xs font-bold uppercase tracking-wider text-slate-500">
                  Workspace
                </span>
              </div>
              <div className="text-sm font-semibold text-slate-800">
                {user.workspace.name}
              </div>
              <div className="text-2xs text-slate-400">slug: {user.workspace.slug}</div>
            </div>

            <button
              role="menuitem"
              onClick={() => {
                setOpen(false);
                setInviteOpen(true);
              }}
              className={clsx(
                "press flex w-full items-center gap-2 px-4 py-2.5 text-sm font-semibold text-slate-700",
                "border-b border-slate-100 transition-colors hover:bg-brand-50 hover:text-brand-700",
              )}
            >
              <UserPlus className="h-3.5 w-3.5" aria-hidden />
              Convidar usuário
            </button>

            <button
              role="menuitem"
              onClick={() => {
                setOpen(false);
                logout();
              }}
              className={clsx(
                "press flex w-full items-center gap-2 px-4 py-2.5 text-sm font-semibold text-rose-600",
                "transition-colors hover:bg-rose-50",
              )}
            >
              <LogOutIcon className="h-3.5 w-3.5" aria-hidden />
              Sair da conta
            </button>
          </div>
        )}
      </div>

      <InviteUserModal open={inviteOpen} onClose={() => setInviteOpen(false)} />
    </>
  );
};

export default UserMenu;
