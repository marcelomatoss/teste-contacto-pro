import { Server as SocketIOServer, Socket } from "socket.io";
import type { Server as HTTPServer } from "node:http";
import { env } from "../config/env.js";
import { logger } from "../config/logger.js";
import { verifyToken } from "../auth/jwt.js";

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

const lastConnectionState = new Map<string, { status: ConnectionStatus; qr?: string | null }>();

const roomFor = (workspaceId: string): string => `workspace:${workspaceId}`;

export const initSocket = (server: HTTPServer) => {
  io = new SocketIOServer(server, {
    cors: { origin: env.CORS_ORIGIN, credentials: true },
  });

  // JWT-authenticated handshake. Token can be passed via auth.token or
  // ?token= query string (eventsource-style fallback).
  io.use((socket, next) => {
    const token =
      (socket.handshake.auth?.token as string | undefined) ||
      (socket.handshake.query?.token as string | undefined);
    if (!token) return next(new Error("UNAUTHENTICATED"));
    const payload = verifyToken(token);
    if (!payload) return next(new Error("INVALID_TOKEN"));
    socket.data.user = payload;
    next();
  });

  io.on("connection", (socket: Socket) => {
    const user = socket.data.user as { workspaceId: string } | undefined;
    if (!user) {
      socket.disconnect(true);
      return;
    }
    socket.join(roomFor(user.workspaceId));
    logger.debug({ socketId: socket.id, workspaceId: user.workspaceId }, "client connected");

    const last = lastConnectionState.get(user.workspaceId);
    if (last) socket.emit("wa.connection.update", last);

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

export const setLastConnectionState = (
  workspaceId: string,
  state: { status: ConnectionStatus; qr?: string | null },
) => {
  lastConnectionState.set(workspaceId, state);
};

export const getLastConnectionState = (
  workspaceId: string,
): { status: ConnectionStatus; qr?: string | null } => {
  return lastConnectionState.get(workspaceId) ?? { status: "disconnected", qr: null };
};

/**
 * Emits an event to a single workspace's room (default) or globally if no
 * workspace is provided. Workspace scoping ensures one tenant never sees
 * another's QR / messages / lead updates.
 */
export const emit = <K extends keyof ServerToClientEvents>(
  event: K,
  payload: Parameters<ServerToClientEvents[K]>[0],
  workspaceId?: string,
) => {
  if (!io) return;
  const target = workspaceId ? io.to(roomFor(workspaceId)) : io;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (target.emit as any)(event, payload);
};
