import { z } from "zod";
import { skillFields, LIMITS } from "../../utils/validators.js";

export const skillSchema = z.object(skillFields);

export const skillUpdateSchema = skillSchema.partial();

export const skillOrderSchema = z.object({
  ids: z.array(z.string().min(1)).max(LIMITS.maxSkills, `At most ${LIMITS.maxSkills} skills`),
});
