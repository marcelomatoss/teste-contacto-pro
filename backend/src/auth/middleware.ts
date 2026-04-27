import type { Request, Response, NextFunction } from "express";
import { verifyToken, type JWTPayload } from "./jwt.js";

declare module "express-serve-static-core" {
  interface Request {
    user?: JWTPayload;
  }
}

const extractToken = (req: Request): string | null => {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) return header.slice(7);
  // Allow ?token=... for static asset endpoints (audio playback) where setting
  // a header from <audio src=""> is impossible.
  if (typeof req.query.token === "string") return req.query.token;
  return null;
};

/**
 * Required auth: rejects with 401 if the JWT is missing or invalid. Attaches
 * the decoded payload to `req.user` for downstream handlers.
 */
export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  const token = extractToken(req);
  if (!token) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  const payload = verifyToken(token);
  if (!payload) {
    res.status(401).json({ error: "Invalid or expired token" });
    return;
  }
  req.user = payload;
  next();
};

/**
 * Optional auth: same as requireAuth but doesn't reject on missing/invalid
 * token. Useful for endpoints that have public + authenticated behaviour.
 */
export const optionalAuth = (req: Request, _res: Response, next: NextFunction) => {
  const token = extractToken(req);
  if (token) {
    const payload = verifyToken(token);
    if (payload) req.user = payload;
  }
  next();
};
