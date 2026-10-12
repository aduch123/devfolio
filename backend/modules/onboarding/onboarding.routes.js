import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware.js";
import { onboardingLimiter } from "../../middleware/rateLimit.js";
import { validate } from "../../middleware/validate.js";
import { submitOnboarding } from "./onboarding.controller.js";
import { completeOnboarding, getState, saveStep } from "./onboarding.wizard.js";
import { onboardingSchema, saveStepSchema } from "./onboarding.schema.js";

const router = Router();

// Wizard (Phase 3)
router.get("/onboarding/state", requireAuth, onboardingLimiter, getState);
router.put(
  "/onboarding/step/:n",
  requireAuth,
  onboardingLimiter,
  validate(saveStepSchema),
  saveStep,
);
router.post("/onboarding/complete", requireAuth, onboardingLimiter, completeOnboarding);

// Old single-form onboarding: removed when the wizard page replaces it (3.4).
router.post("/onboarding", requireAuth, validate(onboardingSchema), submitOnboarding);

export default router;
