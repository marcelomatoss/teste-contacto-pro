import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { api } from "../lib/api";
import {
  clearAuth,
  getStoredToken,
  getStoredUser,
  storeAuth,
  type AuthUser,
} from "../lib/auth";
import { resetSocket } from "../lib/socket";

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(getStoredUser);
  const [loading, setLoading] = useState<boolean>(Boolean(getStoredToken()));

  // On boot with a stored token, validate it against the API. If it's stale
  // (server restarted with a different JWT_SECRET, user deleted, etc.) clear
  // the local state so the user lands on the login screen.
  useEffect(() => {
    let cancelled = false;
    const token = getStoredToken();
    if (!token) {
      setLoading(false);
      return;
    }
    api
      .me()
      .then((fresh) => {
        if (cancelled) return;
        setUser(fresh);
        // Refresh stored user with whatever the server has now.
        storeAuth(token, fresh);
      })
      .catch(() => {
        if (cancelled) return;
        clearAuth();
        setUser(null);
        resetSocket();
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { token, user: u } = await api.login(email, password);
    storeAuth(token, u);
    resetSocket(); // re-handshake socket with the new token
    setUser(u);
  }, []);

  const logout = useCallback(() => {
    clearAuth();
    resetSocket();
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, loading, login, logout }),
    [user, loading, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
};
