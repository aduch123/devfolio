import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware.js";
import { validate } from "../../middleware/validate.js";
import {
  getSocialLinks,
  createSocialLink,
  updateSocialLink,
  deleteSocialLink,
  reorderSocialLinks,
} from "./social.controller.js";
import { socialSchema, socialUpdateSchema, socialOrderSchema } from "./social.schema.js";

const router = Router();

router.get("/social", requireAuth, getSocialLinks);
router.post("/social", requireAuth, validate(socialSchema), createSocialLink);
router.put("/social/order", requireAuth, validate(socialOrderSchema), reorderSocialLinks);
router.patch("/social/:id", requireAuth, validate(socialUpdateSchema), updateSocialLink);
router.delete("/social/:id", requireAuth, deleteSocialLink);

export default router;
