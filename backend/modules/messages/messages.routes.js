import { Router } from "express";
import { validate } from "../../middleware/validate.js";
import { sendContactMessage } from "./messages.controller.js";
import { messageSchema } from "./messages.schema.js";

const router = Router();

router.post("/portfolio/:username/message", validate(messageSchema), sendContactMessage);
router.post("/portfolio/share/:token/message", validate(messageSchema), sendContactMessage);

export default router;
