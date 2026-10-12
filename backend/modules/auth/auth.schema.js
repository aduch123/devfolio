import { z } from "zod";
import { identityEmail } from "../../utils/validators.js";
import { RESERVED_USERNAMES } from "../../config/constants.js";

export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, "Username must be at least 3 characters")
  .max(30, "Username must be at most 30 characters")
  .regex(
    /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/,
    "Use only letters, numbers and dashes, without a leading or trailing dash"
  )
  .refine((v) => !RESERVED_USERNAMES.has(v), "This username is reserved, choose another");

export const signupSchema = z.object({
  email: identityEmail,
  username: usernameSchema,
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password must be at most 128 characters"),
});

export const loginSchema = z.object({
  email: identityEmail,
  password: z.string().min(1, "Password is required").max(128, "Password must be at most 128 characters"),
});

export const verifyEmailSchema = z.object({
  token: z.string().trim().min(20, "Invalid link").max(200, "Invalid link"),
});

export const resendVerificationSchema = z.object({
  email: identityEmail,
});

export const forgotPasswordSchema = z.object({
  email: identityEmail,
});

export const resetPasswordSchema = z.object({
  token: z.string().trim().min(20, "Invalid link").max(200, "Invalid link"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password must be at most 128 characters"),
});
