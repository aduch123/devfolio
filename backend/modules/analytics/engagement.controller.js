import prisma from "../../config/prisma.js";
import { hashShareToken } from "../share/share.controller.js";
import { notFound, badRequest } from "../../utils/AppError.js";
import { visitorHash, excludedVisitor, deviceType, referrerHost } from "./visitor.js";
export async function resolveAnalyticsPortfolio(req, res, next) {
  let user,
    shareLinkId = null;
  if (req.params.token) {
    const link = /^[a-f0-9]{32,64}$/.test(req.params.token)
      ? await prisma.shareLink.findFirst({
          where: {
            tokenHash: hashShareToken(req.params.token),
            revokedAt: null,
            OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
            user: { deletedAt: null },
          },
          select: {
            id: true,
            user: {
              select: {
                id: true,
                profile: { select: { published: true, resumeUrl: true, githubUrl: true } },
              },
            },
          },
        })
      : null;
    user = link?.user;
    shareLinkId = link?.id || null;
  } else
    user = await prisma.user.findUnique({
      where: {
        username: req.params.username.toLowerCase(),
        deletedAt: null,
        profile: { published: true },
      },
      select: {
        id: true,
        profile: { select: { published: true, resumeUrl: true, githubUrl: true } },
      },
    });
  if (!user) throw notFound("Portfolio not found", "PORTFOLIO_NOT_FOUND");
  req.analyticsPortfolio = { ...user, shareLinkId };
  next();
}
export async function recordView(req, res) {
  const user = req.analyticsPortfolio;
  if (await excludedVisitor(req, user.id)) return res.status(204).send();
  const now = new Date();
  const data = {
    userId: user.id,
    visitorHash: visitorHash(req, user.id),
    referrerHost: referrerHost(req.body.referrer),
    deviceType: deviceType(req.headers["user-agent"]),
    shareLinkId: user.shareLinkId,
    createdAt: now,
    windowStart: new Date(Math.floor(now.getTime() / 1800000) * 1800000),
  };
  await prisma.$transaction(async (tx) => {
    const created = await tx.view.createMany({ data: [data], skipDuplicates: true });
    if (created.count && user.shareLinkId)
      await tx.shareLink.update({
        where: { id: user.shareLinkId },
        data: { viewCount: { increment: 1 } },
      });
  });
  res.status(204).send();
}
export async function engagement(req, res) {
  const user = req.analyticsPortfolio;
  if (!user.profile?.published) throw notFound("Portfolio not found", "PORTFOLIO_NOT_FOUND");
  const [count, own] = await prisma.$transaction([
    prisma.like.count({ where: { userId: user.id } }),
    prisma.like.findUnique({
      where: {
        userId_visitorHash: {
          userId: user.id,
          visitorHash: visitorHash(req, user.id, { stable: true }),
        },
      },
      select: { id: true },
    }),
  ]);
  res.set("Cache-Control", "no-store").json({ likes: count, liked: !!own });
}
export async function likePortfolio(req, res) {
  const user = req.analyticsPortfolio;
  if (!user.profile?.published) throw notFound("Portfolio not found", "PORTFOLIO_NOT_FOUND");
  if (!(await excludedVisitor(req, user.id))) {
    const where = { userId: user.id, visitorHash: visitorHash(req, user.id, { stable: true }) };
    if (req.method === "DELETE") await prisma.like.deleteMany({ where });
    else
      await prisma.like.upsert({
        where: { userId_visitorHash: where },
        create: { ...where, createdAt: new Date() },
        update: {},
      });
  }
  return engagement(req, res);
}
export async function recordClick(req, res) {
  const user = req.analyticsPortfolio;
  if (await excludedVisitor(req, user.id)) return res.status(204).send();
  const { targetType, target } = req.body;
  let targetId = null;
  if (["PROJECT_REPO", "PROJECT_LIVE"].includes(targetType)) {
    const project = await prisma.project.findFirst({
      where: {
        userId: user.id,
        [targetType === "PROJECT_REPO" ? "repoUrl" : "liveUrl"]: target || "",
      },
      select: { id: true },
    });
    if (!project) throw badRequest("Unknown project link");
    targetId = project.id;
  } else if (targetType === "SOCIAL") {
    const social = await prisma.socialLink.findFirst({
      where: { userId: user.id, url: target || "" },
      select: { id: true },
    });
    if (!social && target !== user.profile?.githubUrl) throw badRequest("Unknown social link");
    targetId = social?.id || null;
  } else if (targetType === "RESUME" && !user.profile?.resumeUrl)
    throw badRequest("No resume is available");
  await prisma.clickEvent.create({
    data: {
      userId: user.id,
      visitorHash: visitorHash(req, user.id),
      targetType,
      targetId,
      createdAt: new Date(),
    },
  });
  res.status(204).send();
}
