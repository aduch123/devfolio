import cron from "node-cron";
import prisma from "../config/prisma.js";
import logger from "../config/logger.js";
import { ACCOUNT_DELETE_GRACE_DAYS } from "../config/constants.js";

const DAY = 24 * 60 * 60 * 1000;

// Removes accounts past the grace window (cascades to profile, skills, projects, sessions, tokens),
// expired or long-revoked sessions, and expired or used email tokens. Returns the row counts.
export async function runCleanup(now = new Date()) {
  const accounts = await prisma.user.deleteMany({
    where: { deletedAt: { lt: new Date(now.getTime() - ACCOUNT_DELETE_GRACE_DAYS * DAY) } },
  });
  const sessions = await prisma.session.deleteMany({
    where: { OR: [{ expiresAt: { lt: now } }, { revokedAt: { lt: new Date(now.getTime() - 7 * DAY) } }] },
  });
  const tokens = await prisma.emailToken.deleteMany({
    where: { OR: [{ expiresAt: { lt: now } }, { usedAt: { lt: new Date(now.getTime() - DAY) } }] },
  });
  const result = { accounts: accounts.count, sessions: sessions.count, emailTokens: tokens.count };
  logger.info(result, "cleanup job finished");
  return result;
}

// Daily at 03:30 server time, and once shortly after start-up.
export function startJobs() {
  const run = () => runCleanup().catch((err) => logger.error({ err }, "cleanup job failed"));
  cron.schedule("30 3 * * *", run);
  setTimeout(run, 30 * 1000).unref();
}
