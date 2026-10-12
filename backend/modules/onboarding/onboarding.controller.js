import { z } from "zod";
import prisma from "../../config/prisma.js";

const SKILL_VALUES = [
  "html", "css", "javascript", "python", "react", "nodejs",
  "express", "java", "typescript", "nextjs", "postgresql",
  "mongodb", "prisma", "git", "docker", "other",
];

const onboardingSchema = z.object({
  displayName: z.string().min(1),
  aboutText: z.string().min(1),
  heroRoleTexts: z.array(z.string()).optional(),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().optional(),
  githubUrl: z.string().url().optional(),
  skills: z.array(z.object({
    name: z.enum(SKILL_VALUES),
    level: z.enum(["great", "good", "learning"]),
  })).optional(),
  projects: z.array(z.object({
    title: z.string(),
    description: z.string().optional(),
    repoUrl: z.string().url().optional(),
    liveUrl: z.string().url().optional(),
    tags: z.array(z.string()).optional(),
  })).optional(),
});

export const submitOnboarding = async (req, res) => {
  const result = onboardingSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: result.error.flatten() });
  }

  const { skills = [], projects = [], ...profileData } = result.data;

  await prisma.$transaction([
    prisma.profile.update({
      where: { userId: req.user.id },
      data: profileData,
    }),
    prisma.skill.createMany({
      data: skills.map((s) => ({ ...s, userId: req.user.id })),
    }),
    prisma.project.createMany({
      data: projects.map((p) => ({ ...p, userId: req.user.id })),
    }),
    prisma.user.update({
      where: { id: req.user.id },
      data: { onboardingComplete: true },
    }),
  ]);

  res.status(200).json({ success: true });
};