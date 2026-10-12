import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware.js";
import { validate } from "../../middleware/validate.js";
import {
  getOwnProfile,
  updateOwnProfile,
  getPublicPortfolio,
} from "./profile.controller.js";
import { profileUpdateSchema } from "./profile.schema.js";

const router = Router();

router.get("/profile", requireAuth, getOwnProfile);
router.patch("/profile", requireAuth, validate(profileUpdateSchema), updateOwnProfile);
router.get("/portfolio/:username", requireAuth, getPublicPortfolio);

export default router;
