import crypto from "node:crypto";
import prisma from "../config/prisma.js";
import { env } from "../config/env.js";
import { sha256 } from "./session.js";
import { AppError } from "./AppError.js";

export const appUrl = () => env.APP_URL || `http://localhost:${env.PORT}`;

// Creates a token for the user and returns the raw value (only its sha256 is stored).
// Older unused tokens of the same type are removed, so only the newest link works.
export async function createEmailToken(userId, type, ttlMs) {
  const raw = crypto.randomBytes(32).toString("base64url");
  await prisma.$transaction([
    prisma.emailToken.deleteMany({ where: { userId, type, usedAt: null } }),
    prisma.emailToken.create({
      data: { userId, type, tokenHash: sha256(raw), expiresAt: new Date(Date.now() + ttlMs) },
    }),
  ]);
  return raw;
}

// Marks the token used (atomically, so it works once) and returns { userId }.
// Throws 400 TOKEN_USED, TOKEN_EXPIRED or TOKEN_INVALID with a message the page can show.
export async function consumeEmailToken(raw, type) {
  const tokenHash = sha256(raw);
  const now = new Date();
  const claimed = await prisma.emailToken.updateMany({
    where: { tokenHash, type, usedAt: null, expiresAt: { gt: now } },
    data: { usedAt: now },
  });
  const token = await prisma.emailToken.findUnique({ where: { tokenHash } });
  if (claimed.count === 1 && token) return { userId: token.userId };

  if (token && token.type === type) {
    if (token.usedAt) throw new AppError(400, "TOKEN_USED", "This link has already been used.");
    throw new AppError(400, "TOKEN_EXPIRED", "This link has expired. Request a new one.");
  }
  throw new AppError(400, "TOKEN_INVALID", "This link is not valid. Request a new one.");
}
