import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import { submitOnboarding } from "../controllers/onboarding.controller.js";
import { catchAsync } from "../utils/catchAsync.js";

const router = Router();
router.post("/onboarding", requireAuth, catchAsync(submitOnboarding));

export default router;