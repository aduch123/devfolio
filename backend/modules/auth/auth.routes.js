import { Router } from "express";
import { signup, login } from "./auth.controller.js";
import { signupSchema, loginSchema } from "./auth.schema.js";
import { validate } from "../../middleware/validate.js";
import { authLimiter } from "../../middleware/rateLimit.js";

const router = Router();

router.post("/signup", authLimiter, validate(signupSchema), signup);
router.post("/login", authLimiter, validate(loginSchema), login);

export default router;
