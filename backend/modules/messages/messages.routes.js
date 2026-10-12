import { Router } from "express";
import { catchAsync } from "../../utils/catchAsync.js";
import { sendContactMessage } from "./messages.controller.js";

const router = Router();

router.post("/portfolio/:username/message", catchAsync(sendContactMessage));
router.post("/portfolio/share/:token/message", catchAsync(sendContactMessage));

export default router;