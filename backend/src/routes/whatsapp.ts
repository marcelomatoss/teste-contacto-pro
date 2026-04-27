import { Router } from "express";
import { logoutAndReset, startWhatsApp } from "../whatsapp/client.js";
import { logger } from "../config/logger.js";
import { requireAuth } from "../auth/middleware.js";

export const whatsappRouter = Router();

whatsappRouter.use(requireAuth);

/**
 * Disconnect this workspace's WhatsApp account and force a fresh pairing.
 * Returns immediately — heavy work (session wipe + reconnect + new QR) runs
 * in the background and is observable via the `wa.connection.update` socket
 * event scoped to the workspace's room.
 */
whatsappRouter.post("/logout", (req, res) => {
  const workspaceId = req.user!.workspaceId;
  logoutAndReset(workspaceId).catch((err) =>
    logger.error({ err, workspaceId }, "logoutAndReset failed"),
  );
  res.json({ ok: true, message: "Logout iniciado. Aguarde o novo QR." });
});

/**
 * Boots a fresh socket if the workspace's WhatsApp connection isn't live yet.
 * Idempotent — safe to call from the frontend on first load.
 */
whatsappRouter.post("/connect", (req, res) => {
  const workspaceId = req.user!.workspaceId;
  startWhatsApp(workspaceId).catch((err) =>
    logger.error({ err, workspaceId }, "startWhatsApp failed"),
  );
  res.json({ ok: true });
});
