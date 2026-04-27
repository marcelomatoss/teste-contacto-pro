import { io, type Socket } from "socket.io-client";
import { getStoredToken } from "./auth";

const SOCKET_URL = (import.meta.env.VITE_SOCKET_URL as string) || "http://localhost:3001";

let socket: Socket | null = null;

/**
 * Lazily creates the Socket.IO client, attaching the JWT in the auth
 * handshake so the server can place us in the right workspace room.
 *
 * If the token changes (login / logout), call `resetSocket()` first.
 */
export const getSocket = (): Socket => {
  socket ??= io(SOCKET_URL, {
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    auth: () => ({ token: getStoredToken() }),
  });
  return socket;
};

export const resetSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
