import { prisma } from "../db/client.js";

/**
 * Resolves the active workspace for a request. Today the JWT carries
 * workspaceId so this is a simple lookup, but the function exists so other
 * resolution strategies (header, subdomain) can plug in later without
 * touching every handler.
 */
export const getWorkspaceFromRequest = async (workspaceId: string) => {
  return prisma.workspace.findUnique({ where: { id: workspaceId } });
};

export const getDefaultWorkspaceId = async (): Promise<string | null> => {
  const ws = await prisma.workspace.findFirst({ orderBy: { createdAt: "asc" } });
  return ws?.id ?? null;
};
