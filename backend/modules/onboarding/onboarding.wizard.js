import prisma from "../../config/prisma.js";
import { badRequest, conflict, validationError } from "../../utils/AppError.js";
import { zodFields } from "../../middleware/validate.js";
import { skillDerived } from "../../utils/validators.js";
import { SKIPPABLE_FROM, WIZARD_STEPS, stepSchemas } from "./onboarding.schema.js";

const present = (draft, complete) => ({
  step: draft?.step ?? 1,
  data: draft?.data ?? {},
  skipped: draft?.skipped ?? [],
  complete,
});

const stepNumber = (raw) => {
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1 || n > WIZARD_STEPS) {
    throw badRequest(`Steps are numbered 1 to ${WIZARD_STEPS}`, undefined, "INVALID_STEP");
  }
  return n;
};

// Makes sure the user's draft row exists and holds a row lock until the transaction ends, so two
// saves (or a save and "complete") for the same user run one after the other.
async function lockDraft(tx, userId) {
  await tx.onboardingDraft.upsert({ where: { userId }, create: { userId }, update: {} });
  await tx.$queryRaw`SELECT "id" FROM "OnboardingDraft" WHERE "userId" = ${userId} FOR UPDATE`;
  return tx.onboardingDraft.findUnique({ where: { userId } });
}

const alreadyDone = () => conflict("Onboarding is already complete", "ALREADY_ONBOARDED");

export const getState = async (req, res) => {
  const userId = req.user.id;
  const [user, draft] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { onboardingComplete: true } }),
    prisma.onboardingDraft.findUnique({ where: { userId } }),
  ]);
  res.json(present(draft, Boolean(user?.onboardingComplete)));
};

export const saveStep = async (req, res) => {
  const userId = req.user.id;
  const n = stepNumber(req.params.n);
  const { data, skip, next } = req.body;

  let parsed = null;
  if (skip) {
    if (n < SKIPPABLE_FROM) {
      throw badRequest("The basics can't be skipped", undefined, "STEP_REQUIRED");
    }
  } else {
    const result = stepSchemas[n].safeParse(data);
    if (!result.success) throw validationError(zodFields(result.error));
    parsed = result.data;
  }

  const saved = await prisma.$transaction(async (tx) => {
    const draft = await lockDraft(tx, userId);
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { onboardingComplete: true },
    });
    if (user.onboardingComplete) throw alreadyDone();

    const stored = { ...draft.data };
    const skipped = new Set(draft.skipped);
    if (skip) {
      delete stored[n];
      skipped.add(n);
    } else {
      stored[n] = parsed;
      skipped.delete(n);
    }
    return tx.onboardingDraft.update({
      where: { userId },
      data: {
        data: stored,
        skipped: [...skipped].sort((a, b) => a - b),
        step: next ?? Math.min(n + 1, WIZARD_STEPS + 1),
      },
    });
  });

  res.json(present(saved, false));
};

export const completeOnboarding = async (req, res) => {
  const userId = req.user.id;

  const skipped = await prisma.$transaction(async (tx) => {
    const draft = await lockDraft(tx, userId);

    // Atomic guard: only one request can flip the flag from false to true.
    const claimed = await tx.user.updateMany({
      where: { id: userId, onboardingComplete: false },
      data: { onboardingComplete: true },
    });
    if (claimed.count === 0) throw alreadyDone();

    // Throwing here rolls the claim back, so the user can still finish the basics.
    const basics = draft.data["1"];
    if (!basics) {
      throw badRequest("Finish the basics step first", undefined, "BASICS_REQUIRED");
    }
    const about = draft.data["2"] ?? {};
    const skills = draft.data["3"]?.skills ?? [];
    const projects = draft.data["4"]?.projects ?? [];
    const links = draft.data["5"] ?? {};
    const socialLinks = links.socialLinks ?? [];

    await tx.profile.update({
      where: { userId },
      data: {
        displayName: basics.displayName,
        headline: basics.headline ?? null,
        location: basics.location ?? null,
        contactEmail: basics.contactEmail ?? null,
        contactPhone: basics.contactPhone ?? null,
        aboutText: about.aboutText ?? null,
        heroRoleTexts: about.heroRoleTexts ?? [],
        githubUrl: links.githubUrl ?? null,
      },
    });

    // The Phase 2 API can add rows before onboarding is finished: new rows go after them, and a skill
    // that already exists (same name, any casing) is left out instead of failing.
    const [skillBase, projectBase, socialBase] = await Promise.all([
      tx.skill.count({ where: { userId } }),
      tx.project.count({ where: { userId } }),
      tx.socialLink.count({ where: { userId } }),
    ]);
    await tx.skill.createMany({
      data: skills.map((s, i) => ({
        ...s,
        ...skillDerived(s.name, s.category),
        sortOrder: skillBase + i,
        userId,
      })),
      skipDuplicates: true,
    });
    await tx.project.createMany({
      data: projects.map((p, i) => ({ ...p, sortOrder: projectBase + i, userId })),
    });
    await tx.socialLink.createMany({
      data: socialLinks.map((l, i) => ({ ...l, sortOrder: socialBase + i, userId })),
    });

    // The content now lives in the real tables; only the skipped list stays (for the dashboard).
    await tx.onboardingDraft.update({
      where: { userId },
      data: { data: {}, step: WIZARD_STEPS + 1 },
    });
    return draft.skipped ?? [];
  });

  res.json({ skipped });
};
