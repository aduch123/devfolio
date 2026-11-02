import crypto from "node:crypto";
import { env } from "../../config/env.js";
import prisma from "../../config/prisma.js";
import { ACCESS_COOKIE } from "../../config/constants.js";
import { decodeAccessToken } from "../../utils/session.js";
export const DAY = 86400000;
export const isBot = (agent = "") =>
  /bot|crawler|spider|preview|headless|slurp|facebookexternalhit|lighthouse/i.test(agent);
export function visitorHash(req, userId, { stable = false, now = new Date() } = {}) {
  const period = stable ? "likes" : now.toISOString().slice(0, 10);
  return crypto
    .createHmac("sha256", env.JWT_SECRET)
    .update(
      JSON.stringify([
        period,
        userId,
        req.ip || "",
        String(req.headers["user-agent"] || "").slice(0, 500),
      ]),
    )
    .digest("hex");
}
export function deviceType(agent = "") {
  return /ipad|tablet|android(?!.*mobile)/i.test(agent)
    ? "tablet"
    : /mobile|android|iphone/i.test(agent)
      ? "mobile"
      : "desktop";
}
export function referrerHost(value) {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) ? url.hostname.slice(0, 253) : null;
  } catch {
    return null;
  }
}
export async function excludedVisitor(req, userId) {
  if (isBot(req.headers["user-agent"])) return true;
  try {
    const payload = decodeAccessToken(req.cookies?.[ACCESS_COOKIE]);
    if (payload.id !== userId) return false;
    return !!(await prisma.session.findFirst({
      where: { id: payload.sid, userId, revokedAt: null, expiresAt: { gt: new Date() } },
      select: { id: true },
    }));
  } catch {
    return false;
  }
}
