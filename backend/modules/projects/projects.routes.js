import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware.js";
import { validate } from "../../middleware/validate.js";
import {
  getProjects,
  createProject,
  updateProject,
  deleteProject,
  reorderProjects,
} from "./projects.controller.js";
import { projectSchema, projectUpdateSchema, projectOrderSchema } from "./projects.schema.js";

const router = Router();

router.get("/projects", requireAuth, getProjects);
router.post("/projects", requireAuth, validate(projectSchema), createProject);
router.put("/projects/order", requireAuth, validate(projectOrderSchema), reorderProjects);
router.patch("/projects/:id", requireAuth, validate(projectUpdateSchema), updateProject);
router.delete("/projects/:id", requireAuth, deleteProject);

export default router;
