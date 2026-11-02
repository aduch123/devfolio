import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware.js";
import { validate } from "../../middleware/validate.js";
import {
  getOwnProfile,
  updateOwnProfile,
  getPublicPortfolio,
  getOwnPortfolio,
  publishPortfolio,
  unpublishPortfolio,
} from "./profile.controller.js";
import { profileUpdateSchema } from "./profile.schema.js";

const router = Router();

router.get("/profile", requireAuth, getOwnProfile);
router.patch("/profile", requireAuth, validate(profileUpdateSchema), updateOwnProfile);
router.post("/profile/publish", requireAuth, publishPortfolio);
router.post("/profile/unpublish", requireAuth, unpublishPortfolio);
router.get("/portfolio/me", requireAuth, getOwnPortfolio);
router.get("/portfolio/:username", getPublicPortfolio);

export default router;
