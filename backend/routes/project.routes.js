import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import { catchAsync } from "../utils/catchAsync.js";
import {
  getProjects,
  createProject,
  updateProject,
  deleteProject,
} from "../controllers/project.controller.js";

const router = Router();

router.get("/projects", requireAuth, catchAsync(getProjects));
router.post("/projects", requireAuth, catchAsync(createProject));
router.patch("/projects/:id", requireAuth, catchAsync(updateProject));
router.delete("/projects/:id", requireAuth, catchAsync(deleteProject));

export default router;