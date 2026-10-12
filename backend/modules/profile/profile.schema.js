import { z } from "zod";
import {
  LIMITS,
  requiredText,
  optionalEmail,
  optionalPhone,
  optionalUrl,
  optionalText,
  heroRoleTexts,
} from "../../utils/validators.js";
import { sectionConfigSchema } from "../../utils/sectionConfig.js";

export const profileUpdateSchema = z.object({
  displayName: requiredText("Display name", LIMITS.displayName).optional(),
  aboutText: requiredText("About text", LIMITS.aboutText).optional(),
  heroRoleTexts: heroRoleTexts.optional(),
  contactEmail: optionalEmail,
  contactPhone: optionalPhone,
  githubUrl: optionalUrl,
  headline: optionalText(LIMITS.headline),
  location: optionalText(LIMITS.location),
  sectionConfig: sectionConfigSchema,
});
