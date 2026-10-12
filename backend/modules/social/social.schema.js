import { z } from "zod";
import { socialFields, LIMITS } from "../../utils/validators.js";

export const socialSchema = z.object(socialFields);

export const socialUpdateSchema = socialSchema.partial();

export const socialOrderSchema = z.object({
  ids: z.array(z.string().min(1)).max(LIMITS.maxSocial, `At most ${LIMITS.maxSocial} links`),
});
