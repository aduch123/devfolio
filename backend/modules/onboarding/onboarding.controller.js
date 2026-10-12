import prisma from "../../config/prisma.js";
import { conflict } from "../../utils/AppError.js";

export const submitOnboarding = async (req, res) => {
  const { skills = [], projects = [], ...profileData } = req.body;
  const userId = req.user.id;

  await prisma.$transaction(async (tx) => {
    // Atomic guard: only one request can flip the flag from false to true.
    const claimed = await tx.user.updateMany({
      where: { id: userId, onboardingComplete: false },
      data: { onboardingComplete: true },
    });
    if (claimed.count === 0) {
      throw conflict("Onboarding is already complete", "ALREADY_ONBOARDED");
    }

    await tx.profile.update({ where: { userId }, data: profileData });
    await tx.skill.createMany({ data: skills.map((s) => ({ ...s, userId })) });
    await tx.project.createMany({ data: projects.map((p) => ({ ...p, userId })) });
  });

  res.status(200).json({ success: true });
};
