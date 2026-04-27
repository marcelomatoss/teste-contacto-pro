import express from "express";
import cors from "cors";
import http from "node:http";
import path from "node:path";
import fs from "node:fs/promises";
import { env } from "./config/env.js";
import { logger } from "./config/logger.js";
import { initSocket } from "./realtime/socket.js";
import { conversationsRouter } from "./routes/conversations.js";
import { mediaRouter } from "./routes/media.js";
import { statusRouter } from "./routes/status.js";
import { setInboundHandler, startWhatsApp } from "./whatsapp/client.js";
import { handleInbound } from "./pipeline/handleInbound.js";
import { ensureMediaDir } from "./whatsapp/media.js";

async function bootstrap() {
  await fs.mkdir(path.resolve(env.WHATSAPP_SESSION_PATH), { recursive: true });
  await ensureMediaDir();

  const app = express();
  app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
  app.use(express.json({ limit: "1mb" }));

  app.get("/health", (_req, res) => res.json({ ok: true, ts: Date.now() }));
  app.use("/api/status", statusRouter);
  app.use("/api/conversations", conversationsRouter);
  app.use("/api/media", mediaRouter);

  // 404 handler
  app.use((_req, res) => res.status(404).json({ error: "Not found" }));

  const server = http.createServer(app);
  initSocket(server);

  setInboundHandler(handleInbound);

  server.listen(env.PORT, () => {
    logger.info(`API listening on http://localhost:${env.PORT}`);
  });

  // Start WhatsApp connection (non-blocking)
  startWhatsApp().catch((err) => {
    logger.error({ err }, "WhatsApp bootstrap failed");
  });

  const shutdown = async (signal: string) => {
    logger.info({ signal }, "shutting down");
    server.close();
    process.exit(0);
  };
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

bootstrap().catch((err) => {
  logger.error({ err }, "fatal bootstrap error");
  process.exit(1);
});
