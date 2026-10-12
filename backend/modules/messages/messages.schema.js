import { z } from "zod";
import { LIMITS, requiredText, requiredEmail } from "../../utils/validators.js";

export const messageSchema = z.object({
  name: requiredText("Name", LIMITS.personName),
  email: requiredEmail,
  message: requiredText("Message", LIMITS.message),
});
