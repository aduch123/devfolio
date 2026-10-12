import crypto from "crypto";
import prisma from "../../config/prisma.js";
import { notFound } from "../../utils/AppError.js";
import { PUBLIC_PORTFOLIO_SELECT } from "../../utils/publicPortfolio.js";
import { presentPublic } from "../../utils/sectionConfig.js";

export const generateShareToken = async (req, res) => {
  const shareToken = crypto.randomBytes(16).toString("hex");

  await prisma.user.update({
    where: { id: req.user.id },
    data: { shareToken },
  });

  res.status(200).json({ shareToken });
};

export const revokeShareToken = async (req, res) => {
  await prisma.user.update({
    where: { id: req.user.id },
    data: { shareToken: null },
  });

  res.status(204).send();
};

export const getSharedPortfolio = async (req, res) => {
  const { token } = req.params;

  const user = await prisma.user.findUnique({
    where: { shareToken: token, deletedAt: null },
    select: PUBLIC_PORTFOLIO_SELECT,
  });

  if (!user) {
    throw notFound("Invalid or expired share link", "SHARE_LINK_NOT_FOUND");
  }

  res.status(200).json(presentPublic(user));
};

export const getShareToken = async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: { shareToken: true },
  });

  res.status(200).json({ shareToken: user.shareToken });
};