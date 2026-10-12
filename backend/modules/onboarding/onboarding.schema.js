import { z } from "zod";
import {
  LIMITS,
  requiredText,
  optionalEmail,
  optionalPhone,
  optionalUrl,
  heroRoleTexts,
  skillFields,
  projectFields,
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
  projects: z.array(z.object(projectFields)).max(LIMITS.maxProjects, `At most ${LIMITS.maxProjects} projects`).optional(),
});
