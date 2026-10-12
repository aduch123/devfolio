import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware.js";
import { catchAsync } from "../../utils/catchAsync.js";
import {
  getOwnProfile,
  updateOwnProfile,
  getPublicPortfolio,
} from "./profile.controller.js";

const router = Router();

router.get("/profile", requireAuth, catchAsync(getOwnProfile));
router.patch("/profile", requireAuth, catchAsync(updateOwnProfile));
router.get("/portfolio/:username", requireAuth, catchAsync(getPublicPortfolio));

export default router;