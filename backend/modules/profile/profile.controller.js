import prisma from "../../config/prisma.js";
import { notFound } from "../../utils/AppError.js";
import { PUBLIC_PORTFOLIO_SELECT } from "../../utils/publicPortfolio.js";

export const getOwnProfile = async (req, res) => {
  const profile = await prisma.profile.findUnique({
    where: { userId: req.user.id },
  });
  res.status(200).json({ profile });
};

export const updateOwnProfile = async (req, res) => {
  const profile = await prisma.profile.update({
    where: { userId: req.user.id },
    data: req.body,
  });

  res.status(200).json({ profile });
};

export const getPublicPortfolio = async (req, res) => {
  const username = req.params.username.toLowerCase();

  const user = await prisma.user.findUnique({
    where: { username, deletedAt: null },
    select: PUBLIC_PORTFOLIO_SELECT,
  });

  if (!user) {
    throw notFound("User not found", "USER_NOT_FOUND");
  }

  res.status(200).json(user);
};