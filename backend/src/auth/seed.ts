import { prisma } from "../db/client.js";
import { env } from "../config/env.js";
import { logger } from "../config/logger.js";
import { hashPassword } from "./jwt.js";

/**
 * Bootstrap a default workspace + admin user the very first time the app
 * runs against an empty DB. Idempotent — does nothing if any user already
 * exists, so accidental re-runs don't reset credentials.
 */
export const seedDefaultWorkspaceAndAdmin = async (): Promise<void> => {
  const userCount = await prisma.user.count();
  if (userCount > 0) return;

  const workspace = await prisma.workspace.upsert({
    where: { slug: env.DEFAULT_WORKSPACE_SLUG },
    update: {},
    create: {
      slug: env.DEFAULT_WORKSPACE_SLUG,
      name: env.DEFAULT_WORKSPACE_NAME,
    },
  });

  await prisma.user.create({
    data: {
      email: env.ADMIN_EMAIL.toLowerCase(),
      name: "Administrator",
      passwordHash: await hashPassword(env.ADMIN_PASSWORD),
      role: "owner",
      workspaceId: workspace.id,
    },
  });

  logger.warn(
    { email: env.ADMIN_EMAIL, workspace: workspace.slug },
    "Seeded default admin — change the password on first login!",
  );
};
