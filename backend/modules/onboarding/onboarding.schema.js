import { z } from "zod";
import {
  LIMITS,
  requiredText,
  optionalEmail,
  optionalPhone,
  optionalUrl,
  optionalText,
  heroRoleTexts,
  skillFields,
  projectFields,
  socialFields,
} from "../../utils/validators.js";

export const onboardingSchema = z.object({
  displayName: requiredText("Display name", LIMITS.displayName),
  aboutText: requiredText("About text", LIMITS.aboutText),
  heroRoleTexts: heroRoleTexts.optional(),
  contactEmail: optionalEmail,
  contactPhone: optionalPhone,
  githubUrl: optionalUrl,
  skills: z
    .array(z.object(skillFields))
    .max(LIMITS.maxSkills, `At most ${LIMITS.maxSkills} skills`)
    .superRefine((list, ctx) => {
      const seen = new Set();
      list.forEach((s, i) => {
        if (seen.has(s.name.toLowerCase())) {
          ctx.addIssue({ code: "custom", path: [i, "name"], message: "Duplicate skill" });
        }
        seen.add(s.name.toLowerCase());
      });
    })
    .optional(),
  projects: z
    .array(z.object(projectFields))
    .max(LIMITS.maxProjects, `At most ${LIMITS.maxProjects} projects`)
    .optional(),
});

// ---- Wizard (Phase 3) ----
export const WIZARD_STEPS = 5; // 1 basics, 2 about and roles, 3 skills, 4 projects, 5 links (6 = review, client only)
export const SKIPPABLE_FROM = 2; // the basics cannot be skipped

const skillsList = z
  .array(z.object(skillFields))
  .max(LIMITS.maxSkills, `At most ${LIMITS.maxSkills} skills`)
  .superRefine((list, ctx) => {
    const seen = new Set();
    list.forEach((s, i) => {
      if (seen.has(s.name.toLowerCase())) {
        ctx.addIssue({ code: "custom", path: [i, "name"], message: "Duplicate skill" });
      }
      seen.add(s.name.toLowerCase());
    });
  });

// What each step may save. Field names match the Profile columns and the Phase 2 content API.
export const stepSchemas = {
  1: z.object({
    displayName: requiredText("Display name", LIMITS.displayName),
    headline: optionalText(LIMITS.headline),
    location: optionalText(LIMITS.location),
    contactEmail: optionalEmail,
    contactPhone: optionalPhone,
  }),
  2: z.object({
    aboutText: optionalText(LIMITS.aboutText),
    heroRoleTexts: heroRoleTexts.default([]),
  }),
  3: z.object({ skills: skillsList.default([]) }),
  4: z.object({
    projects: z
      .array(z.object(projectFields))
      .max(LIMITS.maxProjects, `At most ${LIMITS.maxProjects} projects`)
      .default([]),
  }),
  5: z.object({
    githubUrl: optionalUrl,
    socialLinks: z
      .array(z.object(socialFields))
      .max(LIMITS.maxSocial, `At most ${LIMITS.maxSocial} links`)
      .default([]),
  }),
};

// PUT /onboarding/step/:n body. `data` is checked against stepSchemas[n] in the controller.
export const saveStepSchema = z
  .object({
    data: z.record(z.string(), z.unknown()).optional(),
    skip: z.boolean().optional(),
    // the step to resume at after this save (default: the next one)
    next: z.number().int().min(1).max(WIZARD_STEPS + 1).optional(),
  })
  .refine((body) => body.skip === true || body.data !== undefined, {
    message: "Send the step's data, or skip it",
    path: ["data"],
  });
