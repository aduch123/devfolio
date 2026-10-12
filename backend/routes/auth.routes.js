import { Router } from 'express'
import { signup, login } from '../controllers/auth.controller.js'
import { catchAsync } from '../utils/catchAsync.js'
import { completeOnboarding } from "../controllers/auth.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const router = Router()

router.post("/signup", catchAsync(signup))
router.post("/login", catchAsync(login))
router.post("/onboarding/complete", requireAuth, completeOnboarding);

export default router