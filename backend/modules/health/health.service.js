import prisma from "../../config/prisma.js";
import logger from "../../config/logger.js";
import { checkLink } from "./linkChecker.js";
import { healthScore, fixLink } from "./score.js";
export const activeChecks = new Map();
let connections = 0;
const waiters = [];
async function limited(action) {
  if (connections >= 3) await new Promise((resolve) => waiters.push(resolve));
  else connections++;
  try {
    return await action();
  } finally {
    const next = waiters.shift();
    if (next) next();
    else connections--;
  }
}
export const healthUser = (id) =>
  prisma.user.findUnique({
    where: { id, deletedAt: null },
    include: {
      profile: true,
      skills: true,
      projects: true,
      socialLinks: true,
      timelineItems: true,
    },
  });
export function collectLinks(user) {
  const links = [];
  for (const project of user.projects || [])
    for (const [field, type] of [
      ["repoUrl", "PROJECT_REPO"],
      ["liveUrl", "PROJECT_LIVE"],
    ])
      if (project[field])
        links.push({
          sourceType: type,
          sourceId: project.id,
          url: project[field],
          label: `${project.title} ${field === "repoUrl" ? "repository" : "live link"}`,
          fix: fixLink("projects", project.id, field),
        });
  for (const social of user.socialLinks || [])
    links.push({
      sourceType: "SOCIAL",
      sourceId: social.id,
      url: social.url,
      label: social.platform,
      fix: fixLink("social", social.id, "url"),
    });
  if (user.profile?.githubUrl)
    links.push({
      sourceType: "PROFILE",
      sourceId: "github",
      url: user.profile.githubUrl,
      label: "GitHub profile",
      fix: fixLink("profile", "profile", "githubUrl"),
    });
  return links;
}
export async function buildHealthReport(userId) {
  const [user, checks, dismissals, history, delivered] = await Promise.all([
    healthUser(userId),
    prisma.linkCheck.findMany({ where: { userId }, orderBy: { checkedAt: "desc" } }),
    prisma.healthDismissal.findMany({ where: { userId } }),
    prisma.healthSnapshot.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 8 }),
    prisma.message.findFirst({
      where: { userId, notificationState: "SENT" },
      select: { id: true },
    }),
  ]);
  if (!user) return null;
  const targets = collectLinks(user);
  const currentChecks = targets.map(
    (target) =>
      checks.find(
        (check) =>
          check.sourceType === target.sourceType &&
          check.sourceId === target.sourceId &&
          check.url === target.url,
      ) || {
        ...target,
        status: "PENDING",
        checkedAt: null,
        reason: "Not checked yet",
        httpStatus: null,
      },
  );
  const score = healthScore(user, currentChecks, {
    delivered: !!delivered,
    dismissed: dismissals.map((row) => row.key),
  });
  return {
    ...score,
    checks: currentChecks,
    history,
    trend: history.length ? score.score - history[0].score : null,
    progress: activeChecks.has(userId) ? { ...activeChecks.get(userId) } : null,
  };
}
export async function runLinkChecks(userId, { checker = checkLink } = {}) {
  if (activeChecks.has(userId)) return;
  const progress = { done: 0, total: 0 };
  activeChecks.set(userId, progress);
  try {
    const user = await healthUser(userId);
    if (!user) return;
    const links = collectLinks(user);
    progress.total = links.length;
    await Promise.all(
      links.map(async (link) => {
        let result;
        try {
          result = await limited(() => checker(link.url));
        } catch {
          result = { status: "BROKEN", httpStatus: null, reason: "The check failed safely" };
        }
        await prisma.linkCheck.upsert({
          where: {
            userId_sourceType_sourceId: {
              userId,
              sourceType: link.sourceType,
              sourceId: link.sourceId,
            },
          },
          create: { userId, ...link, ...result },
          update: { ...link, ...result, checkedAt: new Date() },
        });
        progress.done++;
      }),
    );
    const report = await buildHealthReport(userId);
    if (report)
      await prisma.healthSnapshot.create({
        data: { userId, score: report.score, categories: report.categories },
      });
  } finally {
    activeChecks.delete(userId);
  }
}
export function startCheck(userId) {
  void runLinkChecks(userId).catch((error) =>
    logger.error({ code: error.code }, "Portfolio link-check job failed"),
  );
}
