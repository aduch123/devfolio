import { z } from "zod";
import { projectFields } from "../../utils/validators.js";

export const projectSchema = z.object(projectFields);

export const projectUpdateSchema = projectSchema.partial();
