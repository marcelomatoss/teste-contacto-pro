import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { env } from "../config/env.js";

export interface JWTPayload {
  sub: string;          // user id
  email: string;
  workspaceId: string;
  role: string;
}

export const signToken = (payload: JWTPayload): string =>
  jwt.sign(payload, env.JWT_SECRET, { expiresIn: `${env.JWT_TTL_HOURS}h` });

export const verifyToken = (token: string): JWTPayload | null => {
  try {
    return jwt.verify(token, env.JWT_SECRET) as JWTPayload;
  } catch {
    return null;
  }
};

export const hashPassword = (password: string): Promise<string> =>
  bcrypt.hash(password, 10);

export const verifyPassword = (password: string, hash: string): Promise<boolean> =>
  bcrypt.compare(password, hash);
