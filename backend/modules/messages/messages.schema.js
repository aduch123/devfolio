import { z } from "zod";
import { LIMITS, requiredText, requiredEmail } from "../../utils/validators.js";
export const messageSchema = z.object({
  name: requiredText("Name", LIMITS.personName),
  email: requiredEmail,
  message: requiredText("Message", LIMITS.message),
  website: z.string().max(0, "Message could not be accepted").optional(),
  startedAt: z
    .number()
    .int()
    .positive()
    .refine(
      (value) => Date.now() - value >= 2000 && Date.now() - value < 86400000,
      "Please take a moment before sending your message",
    ),
});
export const messageListSchema = z.object({
  status: z.enum(["UNREAD", "READ", "ARCHIVED"]).optional(),
  q: z.string().trim().max(200).optional(),
  page: z.coerce.number().int().min(1).max(100000).default(1),
});
export const messageUpdateSchema = z.strictObject({
  status: z.enum(["UNREAD", "READ", "ARCHIVED"]),
});
export const messagePreferencesSchema = z.strictObject({ emailNotifications: z.boolean() });
