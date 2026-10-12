import cron from "node-cron";
import prisma from "../config/prisma.js";
import logger from "../config/logger.js";
import { ACCOUNT_DELETE_GRACE_DAYS } from "../config/constants.js";
import { storage } from "../config/storage.js";

const DAY = 24 * 60 * 60 * 1000;

// Removes accounts past the grace window (cascades to profile, skills, projects, sessions, tokens),
// expired or long-revoked sessions, and expired or used email tokens. Returns the row counts.
export async function runCleanup(now = new Date()) {
  const expired = { deletedAt: { lt: new Date(now.getTime() - ACCOUNT_DELETE_GRACE_DAYS * DAY) } };
  // Collect the uploaded files first: the rows (and their urls) vanish with the cascade.
  const owners = await prisma.user.findMany({
    where: expired,
    select: {
      profile: { select: { avatarUrl: true, resumeUrl: true } },
      projects: { select: { coverImageUrl: true } },
    },
  });
  const accounts = await prisma.user.deleteMany({ where: expired });
  const files = owners.flatMap((u) => [
    u.profile?.avatarUrl,
    u.profile?.resumeUrl,
    ...u.projects.map((p) => p.coverImageUrl),
  ]);
  await Promise.all(files.filter(Boolean).map((url) => storage.remove(url)));
  const sessions = await prisma.session.deleteMany({
    where: {
      OR: [{ expiresAt: { lt: now } }, { revokedAt: { lt: new Date(now.getTime() - 7 * DAY) } }],
    },
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
