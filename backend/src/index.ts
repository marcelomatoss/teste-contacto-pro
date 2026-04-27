import express from "express";
import cors from "cors";
import http from "node:http";
import path from "node:path";
import fs from "node:fs/promises";
import type { proto } from "@whiskeysockets/baileys";
import { env } from "./config/env.js";
import { logger } from "./config/logger.js";
import { initSocket } from "./realtime/socket.js";
import { conversationsRouter } from "./routes/conversations.js";
import { mediaRouter } from "./routes/media.js";
import { statusRouter } from "./routes/status.js";
import { whatsappRouter } from "./routes/whatsapp.js";
import { metricsRouter } from "./routes/metrics.js";
import { authRouter } from "./routes/auth.js";
import { httpMetricsMiddleware } from "./observability/httpMiddleware.js";
import { setInboundHandler, startWhatsApp } from "./whatsapp/client.js";
import { handleInbound } from "./pipeline/handleInbound.js";
import { processInbound } from "./pipeline/processInbound.js";
import { ensureMediaDir } from "./whatsapp/media.js";
import { startInboundWorker, stopInboundWorker } from "./queue/inboundQueue.js";
import { initRAG } from "./ai/rag.js";
import { seedDefaultWorkspaceAndAdmin } from "./auth/seed.js";
import { prisma } from "./db/client.js";

async function bootstrap() {
  await fs.mkdir(path.resolve(env.WHATSAPP_SESSION_PATH), { recursive: true });
  await ensureMediaDir();

  const app = express();
  app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
  app.use(express.json({ limit: "1mb" }));
  app.use(httpMetricsMiddleware);

  app.get("/health", (_req, res) => res.json({ ok: true, ts: Date.now() }));
  app.use("/metrics", metricsRouter);
  app.use("/api/auth", authRouter);
  app.use("/api/status", statusRouter);
  app.use("/api/conversations", conversationsRouter);
  app.use("/api/media", mediaRouter);
  app.use("/api/whatsapp", whatsappRouter);

  app.use((_req, res) => res.status(404).json({ error: "Not found" }));

  const server = http.createServer(app);
  initSocket(server);

  setInboundHandler(handleInbound);

  server.listen(env.PORT, () => {
    logger.info(`API listening on http://localhost:${env.PORT}`);
  });

  // Bootstrap order: seed users → init RAG → start worker → start WhatsApp
  await seedDefaultWorkspaceAndAdmin();
  initRAG().catch((err) => logger.warn({ err }, "RAG init failed; falling back to full KB"));

  try {
    startInboundWorker(async (payload) => {
      await processInbound(payload.workspaceId, payload.rawMessage as proto.IWebMessageInfo);
    });
    logger.info("Inbound worker started");
  } catch (err) {
    logger.warn({ err }, "worker failed to start; degraded mode (inline processing)");
  }

  // Boot a Baileys socket for every workspace that has been registered.
  // New workspaces created later trigger startWhatsApp() via /api/whatsapp/connect.
  const workspaces = await prisma.workspace.findMany({ select: { id: true, slug: true } });
  for (const ws of workspaces) {
    startWhatsApp(ws.id).catch((err) =>
      logger.error({ err, workspaceId: ws.id }, "WhatsApp bootstrap failed"),
    );
  }
  logger.info({ workspaces: workspaces.length }, "Bootstrapped WhatsApp sockets");

  const shutdown = async (signal: string) => {
    logger.info({ signal }, "shutting down");
    server.close();
    await stopInboundWorker().catch(() => {});
    process.exit(0);
  };
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

bootstrap().catch((err) => {
  logger.error({ err }, "fatal bootstrap error");
  process.exit(1);
});
