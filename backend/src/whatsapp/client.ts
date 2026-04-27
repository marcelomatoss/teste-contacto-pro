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
import { emit, setLastConnectionState } from "../realtime/socket.js";

let sock: WASocket | null = null;
let connectInProgress = false;

// Tracks message IDs that the bot itself just sent, so we can ignore them
// when WhatsApp echoes them back via messages.upsert (which would otherwise
// create an infinite loop in the self-chat test mode).
const sentByBot = new Set<string>();
const trackSent = (id: string | null | undefined) => {
  if (!id) return;
  sentByBot.add(id);
  if (sentByBot.size > 500) {
    // bound the set so it does not grow forever
    const first = sentByBot.values().next().value;
    if (first) sentByBot.delete(first);
  }
};

const normalizeJid = (jid: string | null | undefined): string => {
  if (!jid) return "";
  // Baileys exposes own user id as `5511999...:1@s.whatsapp.net`; the
  // self-chat JID drops the device suffix.
  return jid.replace(/:\d+@/, "@");
};

export type InboundHandler = (message: proto.IWebMessageInfo) => Promise<void>;

let inboundHandler: InboundHandler | null = null;

export const setInboundHandler = (h: InboundHandler) => {
  inboundHandler = h;
};

export const getSocket = () => sock;

const ensureDir = async (dir: string) => {
  await fs.mkdir(dir, { recursive: true });
};

/**
 * Wipes the persisted Baileys credentials so the next `startWhatsApp()`
 * triggers a fresh QR pairing flow.
 */
const wipeSessionFiles = async (): Promise<void> => {
  const sessionPath = path.resolve(env.WHATSAPP_SESSION_PATH);
  try {
    const entries = await fs.readdir(sessionPath);
    await Promise.all(
      entries.map((entry) =>
        fs.rm(path.join(sessionPath, entry), { recursive: true, force: true }),
      ),
    );
    logger.info("WhatsApp session files wiped");
  } catch (err) {
    logger.error({ err }, "failed to wipe session files");
  }
};

/**
 * User-initiated disconnect. Tells WhatsApp servers about the logout (if a
 * socket exists), then wipes the local session and reopens a fresh socket
 * which will publish a new QR over the realtime channel.
 *
 * Safe to call when already disconnected — it just re-creates the socket.
 */
export const logoutAndReset = async (): Promise<void> => {
  logger.info("WhatsApp logout requested by user");
  if (sock) {
    try {
      await sock.logout("requested by user");
      // sock.logout() triggers `connection.update` with DisconnectReason.loggedOut
      // which the handler below catches to wipe + reconnect. Done.
      return;
    } catch (err) {
      logger.warn({ err }, "sock.logout failed, falling back to local reset");
    }
  }
  // No active socket or remote logout failed — wipe locally and restart.
  await wipeSessionFiles();
  sock = null;
  connectInProgress = false;
  await startWhatsApp();
};

export const startWhatsApp = async () => {
  if (connectInProgress) return;
  connectInProgress = true;

  const sessionPath = path.resolve(env.WHATSAPP_SESSION_PATH);
  await ensureDir(sessionPath);

  const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
  const { version } = await fetchLatestBaileysVersion();

  // Pino-compatible silent logger to avoid Baileys' verbose noise.
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

  sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: false,
    logger: baileysLogger,
    browser: ["ContactPro Bot", "Chrome", "1.0.0"],
    syncFullHistory: false,
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      logger.info("WhatsApp QR code received, scan to authenticate");
      try {
        const dataUrl = await qrcode.toDataURL(qr, { margin: 1, width: 320 });
        setLastConnectionState({ status: "qr", qr: dataUrl });
        emit("wa.connection.update", { status: "qr", qr: dataUrl });
        const ascii = await qrcode.toString(qr, { type: "terminal", small: true });
        // eslint-disable-next-line no-console
        console.log("\n" + ascii + "\n");
      } catch (err) {
        logger.error({ err }, "failed to render QR");
      }
    }

    if (connection === "connecting") {
      setLastConnectionState({ status: "connecting", qr: null });
      emit("wa.connection.update", { status: "connecting" });
    }

    if (connection === "open") {
      logger.info("WhatsApp connection open");
      setLastConnectionState({ status: "connected", qr: null });
      emit("wa.connection.update", { status: "connected" });
    }

    if (connection === "close") {
      const statusCode = (lastDisconnect?.error as Boom | undefined)?.output?.statusCode;
      const isLoggedOut = statusCode === DisconnectReason.loggedOut;
      logger.warn({ statusCode, isLoggedOut }, "WhatsApp connection closed");
      setLastConnectionState({ status: "disconnected", qr: null });
      emit("wa.connection.update", { status: "disconnected" });
      sock = null;
      connectInProgress = false;

      if (isLoggedOut) {
        // User logged out (from phone, from API, or remote ban): the local
        // creds are now stale, and re-using them just yields another 401.
        // Wipe the session and start a fresh connection — Baileys will
        // emit a new QR which the realtime layer pushes to the frontend.
        await wipeSessionFiles();
      }

      // Always attempt to reconnect — fresh QR after logout, otherwise resume.
      setTimeout(() => {
        startWhatsApp().catch((err) => logger.error({ err }, "reconnect failed"));
      }, 1500);
    }
  });

  sock.ev.on("messages.upsert", async (event) => {
    if (event.type !== "notify") return;
    for (const msg of event.messages) {
      if (!msg.message) continue;
      if (!inboundHandler) continue;

      // Skip messages the bot itself just sent (avoids loops on self-chat).
      if (msg.key.id && sentByBot.has(msg.key.id)) continue;

      // Allow `fromMe` only when the user is messaging themselves —
      // i.e. WhatsApp's "Message yourself" feature. This makes single-number
      // testing possible without breaking normal behaviour.
      const ownJid = normalizeJid(sock?.user?.id);
      const remoteJid = normalizeJid(msg.key.remoteJid);
      const isSelfChat = Boolean(ownJid) && remoteJid === ownJid;

      if (msg.key.fromMe && !isSelfChat) continue;

      try {
        await inboundHandler(msg);
      } catch (err) {
        logger.error({ err, key: msg.key }, "inbound handler error");
      }
    }
  });

  connectInProgress = false;
  return sock;
};

export const sendText = async (jid: string, text: string, quoted?: proto.IWebMessageInfo) => {
  if (!sock) throw new Error("WhatsApp socket not initialized");
  const result = await sock.sendMessage(jid, { text }, quoted ? { quoted } : undefined);
  trackSent(result?.key?.id);
  return result;
};

export const sendAudio = async (
  jid: string,
  audioBuffer: Buffer,
  quoted?: proto.IWebMessageInfo,
) => {
  if (!sock) throw new Error("WhatsApp socket not initialized");
  const result = await sock.sendMessage(
    jid,
    {
      audio: audioBuffer,
      mimetype: "audio/ogg; codecs=opus",
      ptt: true,
    },
    quoted ? { quoted } : undefined,
  );
  trackSent(result?.key?.id);
  return result;
};

export const reactToMessage = async (
  jid: string,
  msgKey: proto.IMessageKey,
  emoji: string,
) => {
  if (!sock) throw new Error("WhatsApp socket not initialized");
  const result = await sock.sendMessage(jid, {
    react: { text: emoji, key: msgKey },
  });
  trackSent(result?.key?.id);
  return result;
};
