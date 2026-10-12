import { z } from "zod";
import { identityEmail } from "../../utils/validators.js";
import { usernameSchema } from "../auth/auth.schema.js";

const currentPassword = z
  .string()
  .min(1, "Enter your current password")
  .max(128, "Password must be at most 128 characters");

export const changePasswordSchema = z.object({
  currentPassword,
  newPassword: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password must be at most 128 characters"),
});

export const changeEmailSchema = z.object({
  password: currentPassword,
  email: identityEmail,
});

export const changeUsernameSchema = z.object({
  username: usernameSchema,
});

export const deleteAccountSchema = z.object({
  password: currentPassword,
});
