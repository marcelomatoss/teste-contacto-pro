import { Router } from "express";
import { prisma } from "../db/client.js";
import { requireAuth } from "../auth/middleware.js";

export const conversationsRouter = Router();

conversationsRouter.use(requireAuth);

conversationsRouter.get("/", async (req, res) => {
  const list = await prisma.conversation.findMany({
    where: { workspaceId: req.user!.workspaceId },
    include: { lead: true, messages: { take: 1, orderBy: { createdAt: "desc" } } },
    orderBy: { updatedAt: "desc" },
  });
  res.json(list);
});

conversationsRouter.get("/:id", async (req, res) => {
  const conversation = await prisma.conversation.findFirst({
    where: { id: req.params.id, workspaceId: req.user!.workspaceId },
    include: { lead: true },
  });
  if (!conversation) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }
  res.json(conversation);
});

conversationsRouter.get("/:id/messages", async (req, res) => {
  const conv = await prisma.conversation.findFirst({
    where: { id: req.params.id, workspaceId: req.user!.workspaceId },
    select: { id: true },
  });
  if (!conv) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }
  const messages = await prisma.message.findMany({
    where: { conversationId: conv.id },
    orderBy: { createdAt: "asc" },
  });
  res.json(messages);
});
