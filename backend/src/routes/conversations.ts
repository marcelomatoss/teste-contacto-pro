import { Router } from "express";
import { prisma } from "../db/client.js";

export const conversationsRouter = Router();

conversationsRouter.get("/", async (_req, res) => {
  const list = await prisma.conversation.findMany({
    include: { lead: true, messages: { take: 1, orderBy: { createdAt: "desc" } } },
    orderBy: { updatedAt: "desc" },
  });
  res.json(list);
});

conversationsRouter.get("/:id", async (req, res) => {
  const id = req.params.id;
  const conversation = await prisma.conversation.findUnique({
    where: { id },
    include: { lead: true },
  });
  if (!conversation) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }
  res.json(conversation);
});

conversationsRouter.get("/:id/messages", async (req, res) => {
  const id = req.params.id;
  const messages = await prisma.message.findMany({
    where: { conversationId: id },
    orderBy: { createdAt: "asc" },
  });
  res.json(messages);
});
