import { z } from "zod";
import prisma from "../config/prisma.js";

const profileUpdateSchema = z.object({
  displayName: z.string().min(1).optional(),
  aboutText: z.string().optional(),
  heroRoleTexts: z.array(z.string()).optional(),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().optional(),
  githubUrl: z.string().url().optional(),
});

export const getOwnProfile = async (req, res) => {
  const profile = await prisma.profile.findUnique({
    where: { userId: req.user.id },
  });
  res.status(200).json({ profile });
};

export const updateOwnProfile = async (req, res) => {
  const result = profileUpdateSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: result.error.flatten() });
  }

  const profile = await prisma.profile.update({
    where: { userId: req.user.id },
    data: result.data,
  });

  res.status(200).json({ profile });
};

export const getPublicPortfolio = async (req, res) => {
  const { username } = req.params;

  const user = await prisma.user.findUnique({
    where: { username },
    select: {
      username: true,
      profile: true,
      skills: true,
      projects: true,
    },
  });

  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  res.status(200).json(user);
};