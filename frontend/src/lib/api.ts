import type { Conversation, Message } from "./types";

const API_URL = (import.meta.env.VITE_API_URL as string) || "http://localhost:3001";

const handle = async <T>(res: Response): Promise<T> => {
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
};

export const api = {
  base: API_URL,
  status: () => fetch(`${API_URL}/api/status`).then(handle<{
    whatsapp: { status: string; qr?: string | null };
    services: { ai: boolean; stt: boolean; tts: boolean; queue: boolean };
  }>),
  listConversations: () => fetch(`${API_URL}/api/conversations`).then(handle<Conversation[]>),
  getConversation: (id: string) =>
    fetch(`${API_URL}/api/conversations/${id}`).then(handle<Conversation>),
  getMessages: (id: string) =>
    fetch(`${API_URL}/api/conversations/${id}/messages`).then(handle<Message[]>),
  mediaUrl: (messageId: string) => `${API_URL}/api/media/${messageId}`,
};
