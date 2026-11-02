import { z } from "zod";
export const rangeSchema = z.object({
  days: z.coerce
    .number()
    .refine((n) => [7, 30, 90].includes(n), "Choose 7, 30 or 90 days")
    .default(30),
});
export const viewSchema = z.object({ referrer: z.string().max(2048).optional() });
export const clickSchema = z.object({
  targetType: z.enum(["PROJECT_REPO", "PROJECT_LIVE", "SOCIAL", "RESUME", "CONTACT"]),
  target: z.string().max(300).optional(),
});
