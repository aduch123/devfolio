import { Router } from "express";
import { signup, login, refresh, logout, me, usernameAvailable, verifyEmail, resendVerification, forgotPassword, resetPassword } from "./auth.controller.js";
import { signupSchema, loginSchema, verifyEmailSchema, resendVerificationSchema, forgotPasswordSchema, resetPasswordSchema } from "./auth.schema.js";
import { validate } from "../../middleware/validate.js";
import { requireAuth } from "../../middleware/auth.middleware.js";
import { authLimiter, refreshLimiter, usernameCheckLimiter, emailTokenLimiter, resendLimiter, forgotLimiter } from "../../middleware/rateLimit.js";

const router = Router();

// Session responses must never be cached.
router.use((req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});

router.post("/signup", authLimiter, validate(signupSchema), signup);
router.post("/login", authLimiter, validate(loginSchema), login);
router.get("/username-available", usernameCheckLimiter, usernameAvailable);
router.post("/verify-email", emailTokenLimiter, validate(verifyEmailSchema), verifyEmail);
router.post("/resend-verification", resendLimiter, validate(resendVerificationSchema), resendVerification);
router.post("/forgot-password", forgotLimiter, validate(forgotPasswordSchema), forgotPassword);
router.post("/reset-password", emailTokenLimiter, validate(resetPasswordSchema), resetPassword);
router.post("/refresh", refreshLimiter, refresh);
router.post("/logout", logout);
router.get("/me", requireAuth, me);

export default router;
