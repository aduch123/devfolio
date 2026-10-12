import { z } from "zod";
import {
  LIMITS,
  requiredText,
  optionalEmail,
  optionalPhone,
  optionalUrl,
  heroRoleTexts,
} from "../../utils/validators.js";

export const profileUpdateSchema = z.object({
  displayName: requiredText("Display name", LIMITS.displayName).optional(),
  aboutText: requiredText("About text", LIMITS.aboutText).optional(),
  heroRoleTexts: heroRoleTexts.optional(),
  contactEmail: optionalEmail,
  contactPhone: optionalPhone,
  githubUrl: optionalUrl,
});
