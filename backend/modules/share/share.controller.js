import QRCode from "qrcode";
import crypto from "node:crypto";
import prisma from "../../config/prisma.js";
import { env } from "../../config/env.js";
import { notFound, conflict } from "../../utils/AppError.js";
import { PUBLIC_PORTFOLIO_SELECT } from "../../utils/publicPortfolio.js";
import { presentPublic } from "../../utils/sectionConfig.js";
import { sendPortfolioPage, unavailablePage } from "../portfolio/portfolio.pages.js";

export const hashShareToken = (token) => crypto.createHash("sha256").update(token).digest("hex");
const selectLink = {
  id: true,
  viewCount: true,
  label: true,
  expiresAt: true,
  revokedAt: true,
  createdAt: true,
};
export async function resolveSharedUser(token, select = PUBLIC_PORTFOLIO_SELECT) {
  if (!/^[a-f0-9]{32,64}$/.test(token || "")) return null;
  const link = await prisma.shareLink.findFirst({
    where: {
      tokenHash: hashShareToken(token),
      revokedAt: null,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      user: { deletedAt: null },
    },
    select: { user: { select } },
  });
  return link?.user || null;
}
async function createLink(req) {
  const count = await prisma.shareLink.count({ where: { userId: req.user.id, revokedAt: null } });
  if (count >= 50) throw conflict("Revoke an existing link before creating another", "SHARE_LIMIT");
  const token = crypto.randomBytes(32).toString("hex");
  const link = await prisma.shareLink.create({
    data: {
      userId: req.user.id,
      tokenHash: hashShareToken(token),
      label: req.body.label || "Private link",
      expiresAt: req.body.expiresAt || null,
    },
    select: selectLink,
  });
  return {
    shareLink: link,
    token,
    url: `${env.APP_URL || `http://localhost:${env.PORT}`}/share/${token}`,
  };
}
export const createShareLink = async (req, res) => res.status(201).json(await createLink(req));
export const listShareLinks = async (req, res) => {
  const links = await prisma.shareLink.findMany({
    where: { userId: req.user.id },
    select: selectLink,
    orderBy: { createdAt: "desc" },
  });
  res.json({ shareLinks: links });
};
export const updateShareLink = async (req, res) => {
  const link = await prisma.shareLink.findFirst({
    where: { id: req.params.id, userId: req.user.id, revokedAt: null },
    select: { id: true },
  });
  if (!link) throw notFound("Share link not found", "SHARE_LINK_NOT_FOUND");
  res.json({
    shareLink: await prisma.shareLink.update({
      where: { id: link.id },
      data: req.body,
      select: selectLink,
    }),
  });
};
export const revokeShareLink = async (req, res) => {
  const result = await prisma.shareLink.updateMany({
    where: { id: req.params.id, userId: req.user.id },
    data: { revokedAt: new Date() },
  });
  if (!result.count) throw notFound("Share link not found", "SHARE_LINK_NOT_FOUND");
  res.status(204).send();
};
export const getSharedPortfolio = async (req, res) => {
  const user = await resolveSharedUser(req.params.token);
  if (!user) throw notFound("Invalid, expired or revoked share link", "SHARE_LINK_NOT_FOUND");
  res
    .set({ "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" })
    .json(presentPublic(user));
};
export const sharedPortfolioPage = async (req, res) => {
  const user = await resolveSharedUser(req.params.token);
  if (!user) return unavailablePage(res, "This private link is unavailable");
  return sendPortfolioPage(res, user, { privateLink: true });
};
// Compatibility endpoints expose newly generated tokens once; listing never recovers tokens.
export const generateShareToken = async (req, res) => {
  const created = await createLink(req);
  res.json({ ...created, shareToken: created.token });
};
export const getShareToken = async (req, res) => res.json({ shareToken: null });
export const revokeShareToken = async (req, res) => {
  await prisma.shareLink.updateMany({
    where: { userId: req.user.id, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  res.status(204).send();
};

export const getShareQr = async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: { username: true },
  });
  const url = `${env.APP_URL || `http://localhost:${env.PORT}`}/${encodeURIComponent(user.username)}`;
  res.json({
    dataUrl: await QRCode.toDataURL(url, { width: 240, margin: 2, errorCorrectionLevel: "M" }),
  });
};
