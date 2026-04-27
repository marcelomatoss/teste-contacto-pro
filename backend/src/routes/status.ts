import { Router } from "express";
import { getLastConnectionState } from "../realtime/socket.js";
import { isAIConfigured, isSTTConfigured, isTTSConfigured } from "../config/env.js";
import { isRedisAvailable } from "../queue/connection.js";
import { requireAuth } from "../auth/middleware.js";

export const statusRouter = Router();

statusRouter.get("/", requireAuth, (req, res) => {
  const state = getLastConnectionState(req.user!.workspaceId);
  res.json({
    workspaceId: req.user!.workspaceId,
    whatsapp: state,
    services: {
      ai: isAIConfigured(),
      stt: isSTTConfigured(),
      tts: isTTSConfigured(),
      queue: isRedisAvailable(),
    },
  });
});
