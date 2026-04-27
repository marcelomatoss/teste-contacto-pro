import { Router } from "express";
import { logoutAndReset } from "../whatsapp/client.js";
import { logger } from "../config/logger.js";

export const whatsappRouter = Router();

/**
 * Disconnect the WhatsApp account and force a fresh pairing.
 *
 * Always returns immediately — the heavy reset (session wipe + reconnect +
 * new QR emission) runs in the background. The frontend tracks progress via
 * the existing `wa.connection.update` socket event.
 */
whatsappRouter.post("/logout", (_req, res) => {
  logoutAndReset().catch((err) => logger.error({ err }, "logoutAndReset failed"));
  res.json({ ok: true, message: "Logout iniciado. Aguarde o novo QR." });
});
