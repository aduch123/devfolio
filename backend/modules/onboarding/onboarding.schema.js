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
  skills: z.array(z.object(skillFields)).max(LIMITS.maxSkills, `At most ${LIMITS.maxSkills} skills`).optional(),
  projects: z.array(z.object(projectFields)).max(LIMITS.maxProjects, `At most ${LIMITS.maxProjects} projects`).optional(),
});
