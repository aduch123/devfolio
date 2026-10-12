import { z } from "zod";
import { projectFields, LIMITS } from "../../utils/validators.js";

export const projectSchema = z.object({ ...projectFields, featured: z.boolean().optional() });

export const projectUpdateSchema = projectSchema.partial();

export const projectOrderSchema = z.object({
  ids: z.array(z.string().min(1)).max(LIMITS.maxProjects, `At most ${LIMITS.maxProjects} projects`),
});
