import { Server as SocketIOServer, Socket } from "socket.io";
import type { Server as HTTPServer } from "node:http";
import { env } from "../config/env.js";
import { logger } from "../config/logger.js";

export type ConnectionStatus = "connecting" | "connected" | "disconnected" | "qr";

export interface ServerToClientEvents {
  "wa.connection.update": (payload: { status: ConnectionStatus; qr?: string | null }) => void;
  "wa.message.received": (payload: { message: unknown; conversation: unknown }) => void;
  "wa.message.sent": (payload: { message: unknown }) => void;
  "wa.reaction.sent": (payload: { messageId: string; emoji: string }) => void;
  "audio.transcribed": (payload: { messageId: string; transcription: string }) => void;
  "ai.thinking": (payload: { conversationId: string; on: boolean }) => void;
  "lead.updated": (payload: { conversation: unknown; lead: unknown }) => void;
  "conversation.status_changed": (payload: { conversationId: string; status: string }) => void;
  error: (payload: { message: string; conversationId?: string }) => void;
}

let io: SocketIOServer<Record<string, never>, ServerToClientEvents> | null = null;

let lastConnectionState: { status: ConnectionStatus; qr?: string | null } = {
  status: "disconnected",
  qr: null,
};

export const initSocket = (server: HTTPServer) => {
  io = new SocketIOServer(server, {
    cors: { origin: env.CORS_ORIGIN, credentials: true },
  });

  io.on("connection", (socket: Socket) => {
    logger.debug({ socketId: socket.id }, "client connected");
    socket.emit("wa.connection.update", lastConnectionState);

    socket.on("disconnect", () => {
      logger.debug({ socketId: socket.id }, "client disconnected");
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) throw new Error("Socket.IO not initialized");
  return io;
};

export const setLastConnectionState = (state: { status: ConnectionStatus; qr?: string | null }) => {
  lastConnectionState = state;
};

export const getLastConnectionState = () => lastConnectionState;

export const emit = <K extends keyof ServerToClientEvents>(
  event: K,
  ...args: Parameters<ServerToClientEvents[K]>
) => {
  if (!io) return;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (io.emit as any)(event, ...args);
};
