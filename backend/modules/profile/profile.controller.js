import prisma from "../../config/prisma.js";
import { notFound } from "../../utils/AppError.js";
import { PUBLIC_PORTFOLIO_SELECT } from "../../utils/publicPortfolio.js";
import { mergeSectionConfig, presentProfile, presentPublic } from "../../utils/sectionConfig.js";

export const getOwnProfile = async (req, res) => {
  const profile = await prisma.profile.findUnique({
    where: { userId: req.user.id },
  });
  res.status(200).json({ profile: presentProfile(profile) });
};

export const updateOwnProfile = async (req, res) => {
  const data = { ...req.body };
  if (data.sectionConfig !== undefined) {
    // Merge the patch into what is stored and keep the full, validated config.
    const current = await prisma.profile.findUnique({
      where: { userId: req.user.id },
      select: { sectionConfig: true },
    });
    data.sectionConfig = mergeSectionConfig(current?.sectionConfig, data.sectionConfig);
  }

  const profile = await prisma.profile.update({
    where: { userId: req.user.id },
    data,
  });

  res.status(200).json({ profile: presentProfile(profile) });
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

  res.status(200).json(presentPublic(user));
};
