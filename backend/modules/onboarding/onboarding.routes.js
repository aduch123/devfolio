import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware.js";
import { validate } from "../../middleware/validate.js";
import { submitOnboarding } from "./onboarding.controller.js";
import { onboardingSchema } from "./onboarding.schema.js";

const router = Router();

router.post("/onboarding", requireAuth, validate(onboardingSchema), submitOnboarding);

export default router;
