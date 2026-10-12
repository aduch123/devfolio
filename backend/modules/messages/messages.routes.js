import { Router } from "express";
import { validate } from "../../middleware/validate.js";
import { contactLimiter } from "../../middleware/rateLimit.js";
import { sendContactMessage } from "./messages.controller.js";
import { messageSchema } from "./messages.schema.js";

const router = Router();

router.post(
  "/portfolio/:username/message",
  contactLimiter,
  validate(messageSchema),
  sendContactMessage,
);
router.post(
  "/portfolio/share/:token/message",
  contactLimiter,
  validate(messageSchema),
  sendContactMessage,
);

export default router;
