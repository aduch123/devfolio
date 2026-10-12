import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import { catchAsync } from "../utils/catchAsync.js";
import {
  getSkills,
  createSkill,
  updateSkill,
  deleteSkill,
} from "../controllers/skill.controller.js";

const router = Router();

router.get("/skills", requireAuth, catchAsync(getSkills));
router.post("/skills", requireAuth, catchAsync(createSkill));
router.patch("/skills/:id", requireAuth, catchAsync(updateSkill));
router.delete("/skills/:id", requireAuth, catchAsync(deleteSkill));

export default router;