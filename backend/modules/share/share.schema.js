import { z } from "zod";
const expiry = z.iso
  .datetime({ offset: true })
  .transform((value) => new Date(value))
  .refine((value) => value > new Date(), "Choose a future expiry")
  .nullable()
  .optional();
export const shareCreateSchema = z.object({
  label: z.string().trim().min(1).max(80).default("Private link"),
  expiresAt: expiry,
});
export const shareUpdateSchema = z.strictObject({
  label: z.string().trim().min(1).max(80).optional(),
  expiresAt: expiry,
});
