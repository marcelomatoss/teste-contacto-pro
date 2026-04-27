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

export type InboundHandler = (message: proto.IWebMessageInfo) => Promise<void>;

let inboundHandler: InboundHandler | null = null;

export const setInboundHandler = (h: InboundHandler) => {
  inboundHandler = h;
};

export const getSocket = () => sock;

const ensureDir = async (dir: string) => {
  await fs.mkdir(dir, { recursive: true });
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
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
      logger.warn({ statusCode, shouldReconnect }, "WhatsApp connection closed");
      setLastConnectionState({ status: "disconnected", qr: null });
      emit("wa.connection.update", { status: "disconnected" });
      connectInProgress = false;

      if (shouldReconnect) {
        setTimeout(() => {
          startWhatsApp().catch((err) => logger.error({ err }, "reconnect failed"));
        }, 2000);
      }
    }
  });

  sock.ev.on("messages.upsert", async (event) => {
    if (event.type !== "notify") return;
    for (const msg of event.messages) {
      if (msg.key.fromMe) continue;
      if (!msg.message) continue;
      if (!inboundHandler) continue;
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
  return sock.sendMessage(jid, { text }, quoted ? { quoted } : undefined);
};

export const sendAudio = async (
  jid: string,
  audioBuffer: Buffer,
  quoted?: proto.IWebMessageInfo,
) => {
  if (!sock) throw new Error("WhatsApp socket not initialized");
  return sock.sendMessage(
    jid,
    {
      audio: audioBuffer,
      mimetype: "audio/ogg; codecs=opus",
      ptt: true,
    },
    quoted ? { quoted } : undefined,
  );
};

export const reactToMessage = async (
  jid: string,
  msgKey: proto.IMessageKey,
  emoji: string,
) => {
  if (!sock) throw new Error("WhatsApp socket not initialized");
  return sock.sendMessage(jid, {
    react: { text: emoji, key: msgKey },
  });
};
