import "dotenv/config";
import { RESERVED_USERNAMES } from "../config/constants.js";
import bcrypt from "bcrypt";
import prisma from "../config/prisma.js";
import { demoPortfolio } from "../utils/demoPortfolio.js";
import { requiredEmail } from "../utils/validators.js";
try {
  const email = requiredEmail.parse(process.env.DEMO_EMAIL).toLowerCase(),
    password = process.env.DEMO_PASSWORD;
  if (!password || password.length < 12)
    throw Error("Set DEMO_PASSWORD to at least 12 characters; there is no default password");
  const username = process.env.DEMO_USERNAME || "sample-developer";
  if (RESERVED_USERNAMES.has(username)) throw Error("Choose a non-reserved DEMO_USERNAME");
  if (!/^[a-z0-9](?:[a-z0-9-]{1,28}[a-z0-9])$/.test(username))
    throw Error("Choose a valid DEMO_USERNAME");
  if (
    await prisma.user.findFirst({ where: { OR: [{ email }, { username }] }, select: { id: true } })
  )
    throw Error("Demo email or username already exists; existing accounts are never overwritten");
  const { profile, skills, projects, socialLinks, timelineItems } = demoPortfolio;
  await prisma.user.create({
    data: {
      email,
      username,
      passwordHash: await bcrypt.hash(password, 12),
      onboardingComplete: true,
      profile: { create: { ...profile, published: false, contactEmail: email } },
      skills: {
        create: skills.map((item, sortOrder) => ({
          ...item,
          category: "other",
          isCustom: true,
          sortOrder,
        })),
      },
      projects: { create: projects.map((item, sortOrder) => ({ ...item, sortOrder })) },
      socialLinks: {
        create: socialLinks.map((item, sortOrder) => ({ ...item, platform: "github", sortOrder })),
      },
      timelineItems: {
        create: timelineItems.map((item, sortOrder) => ({
          ...item,
          startDate: new Date(item.startDate),
          endDate: item.endDate ? new Date(item.endDate) : null,
          sortOrder,
        })),
      },
    },
  });
  console.log(
    "Sample account created as an unverified draft. Sign in, verify your email and publish when ready. No email was sent by the seed script.",
  );
} catch (error) {
  console.error(error.name === "ZodError" ? "Set DEMO_EMAIL to an inbox you own." : error.message);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
