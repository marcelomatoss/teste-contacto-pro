import { io, type Socket } from "socket.io-client";

const SOCKET_URL = (import.meta.env.VITE_SOCKET_URL as string) || "http://localhost:3001";

let socket: Socket | null = null;

export const getSocket = (): Socket => {
  if (!socket) {
    socket = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });
  }
  return socket;
};
