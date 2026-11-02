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
  theme: z.enum(["editor", "minimal", "bold", "gradient"]).optional(),
  accentColor: z
    .string()
    .regex(/^#[0-9a-f]{6}$/i, "Choose a six-digit hex color")
    .transform((value) => value.toLowerCase())
    .optional(),
  colorMode: z.enum(["auto", "light", "dark"]).optional(),
  seoTitle: optionalText(80),
  seoDescription: optionalText(160),
  ogImageUrl: optionalUrl,
});
