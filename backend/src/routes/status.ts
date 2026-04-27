import { Router } from "express";
import { getLastConnectionState } from "../realtime/socket.js";
import { isAIConfigured, isSTTConfigured, isTTSConfigured } from "../config/env.js";

export const statusRouter = Router();

statusRouter.get("/", (_req, res) => {
  const state = getLastConnectionState();
  res.json({
    whatsapp: state,
    services: {
      ai: isAIConfigured(),
      stt: isSTTConfigured(),
      tts: isTTSConfigured(),
    },
  });
});
