import { Router } from "express";
import path from "node:path";
import fs from "node:fs";
import { prisma } from "../db/client.js";
import { env } from "../config/env.js";

export const mediaRouter = Router();

mediaRouter.get("/:messageId", async (req, res) => {
  const { messageId } = req.params;
  const msg = await prisma.message.findUnique({ where: { id: messageId } });

  if (!msg || !msg.mediaPath) {
    res.status(404).json({ error: "Media not found" });
    return;
  }

  const mediaRoot = path.resolve(env.MEDIA_PATH);
  const filePath = path.resolve(msg.mediaPath);

  if (!filePath.startsWith(mediaRoot)) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  if (!fs.existsSync(filePath)) {
    res.status(404).json({ error: "File missing" });
    return;
  }

  res.setHeader("Content-Type", "audio/ogg");
  res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
  fs.createReadStream(filePath).pipe(res);
});
