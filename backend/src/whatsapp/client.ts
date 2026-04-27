import {
  default as makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  type WASocket,
  type proto,
} from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import qrcode from "qrcode";
import path from "node:path";
import fs from "node:fs/promises";
import { env } from "../config/env.js";
import { logger } from "../config/logger.js";
import {
  emit,
  setLastConnectionState,
  type ConnectionStatus as WASStatus,
} from "../realtime/socket.js";

interface WorkspaceSocket {
  sock: WASocket | null;
  connectInProgress: boolean;
  /** ids of messages this bot just sent (for self-chat dedup) */
  sentByBot: Set<string>;
}

const sockets = new Map<string, WorkspaceSocket>();

const trackSent = (ws: WorkspaceSocket, id: string | null | undefined) => {
  if (!id) return;
  ws.sentByBot.add(id);
  if (ws.sentByBot.size > 500) {
    const first = ws.sentByBot.values().next().value;
    if (first) ws.sentByBot.delete(first);
  }
};

const normalizeJid = (jid: string | null | undefined): string =>
  jid ? jid.replace(/:\d+@/, "@") : "";

export type InboundHandler = (
  workspaceId: string,
  message: proto.IWebMessageInfo,
) => Promise<void>;

let inboundHandler: InboundHandler | null = null;
export const setInboundHandler = (h: InboundHandler) => {
  inboundHandler = h;
};

const sessionPathFor = (workspaceId: string): string =>
  path.resolve(env.WHATSAPP_SESSION_PATH, workspaceId);

const ensureWorkspaceState = (workspaceId: string): WorkspaceSocket => {
  let ws = sockets.get(workspaceId);
  if (!ws) {
    ws = { sock: null, connectInProgress: false, sentByBot: new Set() };
    sockets.set(workspaceId, ws);
  }
  return ws;
};

export const getWASocket = (workspaceId: string): WASocket | null =>
  sockets.get(workspaceId)?.sock ?? null;

/**
 * Wipes the persisted Baileys credentials for a single workspace so the next
 * `startWhatsApp(workspaceId)` triggers a fresh QR pairing flow.
 */
const wipeSessionFiles = async (workspaceId: string): Promise<void> => {
  const sessionPath = sessionPathFor(workspaceId);
  try {
    const entries = await fs.readdir(sessionPath);
    await Promise.all(
      entries.map((entry) =>
        fs.rm(path.join(sessionPath, entry), { recursive: true, force: true }),
      ),
    );
    logger.info({ workspaceId }, "WhatsApp session files wiped");
  } catch (err) {
    logger.error({ err, workspaceId }, "failed to wipe session files");
  }
};

/**
 * Starts (or reconnects) the Baileys socket for a workspace. Idempotent:
 * if a connection is already in progress for that workspace, it just
 * returns the existing one.
 */
export const startWhatsApp = async (workspaceId: string): Promise<WASocket | null> => {
  const ws = ensureWorkspaceState(workspaceId);
  if (ws.connectInProgress) return ws.sock;
  ws.connectInProgress = true;

  const sessionPath = sessionPathFor(workspaceId);
  await fs.mkdir(sessionPath, { recursive: true });

  const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
  const { version } = await fetchLatestBaileysVersion();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const baileysLogger: any = {
    level: "silent",
    fatal: () => {},
    error: () => {},
    warn: () => {},
    info: () => {},
    debug: () => {},
    trace: () => {},
    child: () => baileysLogger,
  };

  const sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: false,
    logger: baileysLogger,
    browser: ["ContactPro Bot", "Chrome", "1.0.0"],
    syncFullHistory: false,
  });

  ws.sock = sock;

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      logger.info({ workspaceId }, "WhatsApp QR code received, scan to authenticate");
      try {
        const dataUrl = await qrcode.toDataURL(qr, { margin: 1, width: 320 });
        setLastConnectionState(workspaceId, { status: "qr", qr: dataUrl });
        emit("wa.connection.update", { status: "qr", qr: dataUrl }, workspaceId);
        const ascii = await qrcode.toString(qr, { type: "terminal", small: true });
        // eslint-disable-next-line no-console
        console.log(`\n[workspace ${workspaceId}]\n` + ascii + "\n");
      } catch (err) {
        logger.error({ err, workspaceId }, "failed to render QR");
      }
    }

    if (connection === "connecting") {
      setLastConnectionState(workspaceId, { status: "connecting", qr: null });
      emit("wa.connection.update", { status: "connecting" }, workspaceId);
    }

    if (connection === "open") {
      logger.info({ workspaceId }, "WhatsApp connection open");
      setLastConnectionState(workspaceId, { status: "connected", qr: null });
      emit("wa.connection.update", { status: "connected" }, workspaceId);
    }

    if (connection === "close") {
      const statusCode = (lastDisconnect?.error as Boom | undefined)?.output?.statusCode;
      const isLoggedOut = statusCode === DisconnectReason.loggedOut;
      logger.warn({ statusCode, isLoggedOut, workspaceId }, "WhatsApp connection closed");
      setLastConnectionState(workspaceId, { status: "disconnected", qr: null });
      emit("wa.connection.update", { status: "disconnected" }, workspaceId);
      ws.sock = null;
      ws.connectInProgress = false;

      if (isLoggedOut) {
        await wipeSessionFiles(workspaceId);
      }
      setTimeout(() => {
        startWhatsApp(workspaceId).catch((err) =>
          logger.error({ err, workspaceId }, "reconnect failed"),
        );
      }, 1500);
    }
  });

  sock.ev.on("messages.upsert", async (event) => {
    if (event.type !== "notify") return;
    for (const msg of event.messages) {
      if (!msg.message) continue;
      if (!inboundHandler) continue;
      if (msg.key.id && ws.sentByBot.has(msg.key.id)) continue;

      const ownJid = normalizeJid(sock.user?.id);
      const remoteJid = normalizeJid(msg.key.remoteJid);
      const isSelfChat = Boolean(ownJid) && remoteJid === ownJid;

      if (msg.key.fromMe && !isSelfChat) continue;

      try {
        await inboundHandler(workspaceId, msg);
      } catch (err) {
        logger.error({ err, key: msg.key, workspaceId }, "inbound handler error");
      }
    }
  });

  ws.connectInProgress = false;
  return sock;
};

export const sendText = async (
  workspaceId: string,
  jid: string,
  text: string,
  quoted?: proto.IWebMessageInfo,
) => {
  const ws = sockets.get(workspaceId);
  if (!ws?.sock) throw new Error(`WhatsApp socket not initialised for workspace ${workspaceId}`);
  const result = await ws.sock.sendMessage(jid, { text }, quoted ? { quoted } : undefined);
  trackSent(ws, result?.key?.id);
  return result;
};

export const sendAudio = async (
  workspaceId: string,
  jid: string,
  audioBuffer: Buffer,
  quoted?: proto.IWebMessageInfo,
) => {
  const ws = sockets.get(workspaceId);
  if (!ws?.sock) throw new Error(`WhatsApp socket not initialised for workspace ${workspaceId}`);
  const result = await ws.sock.sendMessage(
    jid,
    {
      audio: audioBuffer,
      mimetype: "audio/ogg; codecs=opus",
      ptt: true,
    },
    quoted ? { quoted } : undefined,
  );
  trackSent(ws, result?.key?.id);
  return result;
};

export const reactToMessage = async (
  workspaceId: string,
  jid: string,
  msgKey: proto.IMessageKey,
  emoji: string,
) => {
  const ws = sockets.get(workspaceId);
  if (!ws?.sock) throw new Error(`WhatsApp socket not initialised for workspace ${workspaceId}`);
  const result = await ws.sock.sendMessage(jid, { react: { text: emoji, key: msgKey } });
  trackSent(ws, result?.key?.id);
  return result;
};

/**
 * User-initiated disconnect for a single workspace.
 */
export const logoutAndReset = async (workspaceId: string): Promise<void> => {
  logger.info({ workspaceId }, "WhatsApp logout requested by user");
  const ws = sockets.get(workspaceId);
  if (ws?.sock) {
    try {
      await ws.sock.logout("requested by user");
      return;
    } catch (err) {
      logger.warn({ err, workspaceId }, "sock.logout failed, falling back to local reset");
    }
  }
  await wipeSessionFiles(workspaceId);
  if (ws) {
    ws.sock = null;
    ws.connectInProgress = false;
  }
  await startWhatsApp(workspaceId);
};

// Re-export so other modules reading the type still resolve it.
export type { WASStatus };
