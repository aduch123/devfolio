import prisma from "../../config/prisma.js";

export const submitOnboarding = async (req, res) => {
  const { skills = [], projects = [], ...profileData } = req.body;

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