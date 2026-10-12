import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware.js";
import { validate } from "../../middleware/validate.js";
import {
  getSkills,
  createSkill,
  updateSkill,
  deleteSkill,
} from "./skills.controller.js";
import { skillSchema, skillUpdateSchema } from "./skills.schema.js";

const router = Router();

router.get("/skills", requireAuth, getSkills);
router.post("/skills", requireAuth, validate(skillSchema), createSkill);
router.patch("/skills/:id", requireAuth, validate(skillUpdateSchema), updateSkill);
router.delete("/skills/:id", requireAuth, deleteSkill);

export default router;
