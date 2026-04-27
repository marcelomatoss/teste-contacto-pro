import { describe, it, expect } from "vitest";
import {
  hashPassword,
  signToken,
  verifyPassword,
  verifyToken,
  type JWTPayload,
} from "./jwt.js";

const samplePayload: JWTPayload = {
  sub: "user_123",
  email: "demo@contactpro.local",
  workspaceId: "ws_abc",
  role: "owner",
};

describe("password hashing", () => {
  it("verifies a correct password", async () => {
    const hash = await hashPassword("hunter2");
    expect(await verifyPassword("hunter2", hash)).toBe(true);
  });

  it("rejects an incorrect password", async () => {
    const hash = await hashPassword("hunter2");
    expect(await verifyPassword("hunter3", hash)).toBe(false);
  });

  it("produces different hashes for the same password (salted)", async () => {
    const a = await hashPassword("same");
    const b = await hashPassword("same");
    expect(a).not.toBe(b);
  });
});

describe("JWT", () => {
  it("round-trips a payload", () => {
    const token = signToken(samplePayload);
    const decoded = verifyToken(token);
    expect(decoded?.sub).toBe(samplePayload.sub);
    expect(decoded?.email).toBe(samplePayload.email);
    expect(decoded?.workspaceId).toBe(samplePayload.workspaceId);
    expect(decoded?.role).toBe(samplePayload.role);
  });

  it("returns null for a tampered token", () => {
    const token = signToken(samplePayload);
    const tampered = token.slice(0, -4) + "abcd";
    expect(verifyToken(tampered)).toBeNull();
  });

  it("returns null for garbage input", () => {
    expect(verifyToken("not-a-jwt")).toBeNull();
    expect(verifyToken("")).toBeNull();
  });
});
