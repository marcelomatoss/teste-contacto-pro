import type { Conversation, Message } from "./types";
import type { AuthUser } from "./auth";
import { clearAuth, getStoredToken } from "./auth";

const API_URL = (import.meta.env.VITE_API_URL as string) || "http://localhost:3001";

const authHeaders = (): Record<string, string> => {
  const token = getStoredToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const handle = async <T>(res: Response): Promise<T> => {
  if (res.status === 401) {
    clearAuth();
    throw new Error("Sessão expirada. Faça login novamente.");
  }
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
};

const get = <T>(path: string): Promise<T> =>
  fetch(`${API_URL}${path}`, { headers: authHeaders() }).then(handle<T>);

const post = <T>(path: string, body?: unknown): Promise<T> =>
  fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: body ? JSON.stringify(body) : undefined,
  }).then(handle<T>);

export const api = {
  base: API_URL,
  // Auth
  login: (email: string, password: string) =>
    post<{ token: string; user: AuthUser }>("/api/auth/login", { email, password }),
  me: () => get<AuthUser>("/api/auth/me"),

  // App
  status: () =>
    get<{
      workspaceId: string;
      whatsapp: { status: string; qr?: string | null };
      services: { ai: boolean; stt: boolean; tts: boolean; queue: boolean };
    }>("/api/status"),
  listConversations: () => get<Conversation[]>("/api/conversations"),
  getConversation: (id: string) => get<Conversation>(`/api/conversations/${id}`),
  getMessages: (id: string) => get<Message[]>(`/api/conversations/${id}/messages`),
  whatsappLogout: () => post<{ ok: boolean; message?: string }>("/api/whatsapp/logout"),
  whatsappConnect: () => post<{ ok: boolean }>("/api/whatsapp/connect"),

  // Media has to embed token in the URL because <audio> tags can't set headers
  mediaUrl: (messageId: string) => {
    const token = getStoredToken();
    return `${API_URL}/api/media/${messageId}${token ? `?token=${encodeURIComponent(token)}` : ""}`;
  },
};
