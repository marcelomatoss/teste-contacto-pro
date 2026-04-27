import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db/client.js";
import { hashPassword, signToken, verifyPassword } from "../auth/jwt.js";
import { requireAuth } from "../auth/middleware.js";
import { logger } from "../config/logger.js";

export const authRouter = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

authRouter.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid payload" });
    return;
  }

  const { email, password } = parsed.data;
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    include: { workspace: true },
  });

  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    res.status(401).json({ error: "Email ou senha inválidos" });
    return;
  }

  const token = signToken({
    sub: user.id,
    email: user.email,
    workspaceId: user.workspaceId,
    role: user.role,
  });

  logger.info({ userId: user.id, workspaceId: user.workspaceId }, "user login");
  res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      workspace: { id: user.workspace.id, slug: user.workspace.slug, name: user.workspace.name },
    },
  });
});

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().optional(),
  workspaceSlug: z.string().min(1),
});

/**
 * Create an additional user inside an existing workspace. The first user is
 * seeded automatically at boot — this route lets the workspace owner invite
 * teammates by sharing the workspace slug + a temporary password.
 *
 * Authenticated (only existing workspace members can add users to their own
 * workspace; cross-workspace invites are forbidden).
 */
authRouter.post("/register", requireAuth, async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid payload" });
    return;
  }
  const { email, password, name, workspaceSlug } = parsed.data;

  const workspace = await prisma.workspace.findUnique({ where: { slug: workspaceSlug } });
  if (!workspace) {
    res.status(404).json({ error: "Workspace não encontrado" });
    return;
  }
  if (workspace.id !== req.user!.workspaceId) {
    res.status(403).json({ error: "Você não pode adicionar usuários a outro workspace" });
    return;
  }

  const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (existing) {
    res.status(409).json({ error: "Email já cadastrado" });
    return;
  }

  const user = await prisma.user.create({
    data: {
      email: email.toLowerCase(),
      passwordHash: await hashPassword(password),
      name: name ?? null,
      workspaceId: workspace.id,
      role: "member",
    },
  });

  res.status(201).json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
  });
});

authRouter.get("/me", requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.sub },
    include: { workspace: true },
  });
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    workspace: { id: user.workspace.id, slug: user.workspace.slug, name: user.workspace.name },
  });
});
