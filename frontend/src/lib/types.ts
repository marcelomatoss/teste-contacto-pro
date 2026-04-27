export type ConnectionStatus = "connecting" | "connected" | "disconnected" | "qr";

export interface Lead {
  id: string;
  conversationId: string;
  name: string | null;
  company: string | null;
  phone: string | null;
  serviceInterest: string | null;
  leadGoal: string | null;
  estimatedVolume: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  whatsappId: string | null;
  direction: "inbound" | "outbound";
  type: "text" | "audio";
  content: string | null;
  mediaPath: string | null;
  transcription: string | null;
  status: string;
  reaction: string | null;
  createdAt: string;
}

export interface Conversation {
  id: string;
  whatsappJid: string;
  contactName: string | null;
  status: string;
  intent: string | null;
  lead?: Lead | null;
  messages?: Message[];
  createdAt: string;
  updatedAt: string;
}
