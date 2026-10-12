import { z } from "zod";
import { skillFields } from "../../utils/validators.js";

export const skillSchema = z.object(skillFields);

export const skillUpdateSchema = skillSchema.partial();
