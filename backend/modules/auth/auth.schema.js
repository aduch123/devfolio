import { z } from "zod";
import { requiredEmail } from "../../utils/validators.js";

export const signupSchema = z.object({
  email: requiredEmail,
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(20, "Username must be at most 20 characters"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password must be at most 128 characters"),
});

export const loginSchema = z.object({
  email: requiredEmail,
  password: z.string().min(1, "Password is required").max(128, "Password must be at most 128 characters"),
});
