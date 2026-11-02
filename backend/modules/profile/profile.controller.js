import prisma from "../../config/prisma.js";
import { notFound, forbidden, badRequest } from "../../utils/AppError.js";
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
    where: { username, deletedAt: null, profile: { published: true } },
    select: PUBLIC_PORTFOLIO_SELECT,
  });

  if (!user) {
    throw notFound("User not found", "USER_NOT_FOUND");
  }

  res.status(200).json(presentPublic(user));
};

// Owner reads deliberately use the same allowlist as visitor reads.
export const getOwnPortfolio = async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id, deletedAt: null },
    select: PUBLIC_PORTFOLIO_SELECT,
  });
  if (!user) throw notFound("User not found", "USER_NOT_FOUND");
  res.status(200).json(presentPublic(user));
};

export const publishPortfolio = async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id, deletedAt: null },
    select: { emailVerifiedAt: true, profile: true },
  });
  if (!user?.emailVerifiedAt) {
    throw forbidden("Verify your email before publishing", "EMAIL_NOT_VERIFIED");
  }
  if (!user.profile?.displayName?.trim() || !user.profile?.aboutText?.trim()) {
    throw badRequest(
      "Add your name and about text before publishing",
      undefined,
      "INCOMPLETE_PROFILE",
    );
  }
  const profile = await prisma.profile.update({
    where: { userId: req.user.id },
    data: { published: true, publishedAt: user.profile.publishedAt || new Date() },
  });
  res.status(200).json({ profile: presentProfile(profile) });
};

export const unpublishPortfolio = async (req, res) => {
  const profile = await prisma.profile.update({
    where: { userId: req.user.id },
    data: { published: false },
  });
  res.status(200).json({ profile: presentProfile(profile) });
};
