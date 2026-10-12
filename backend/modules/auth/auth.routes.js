import { Router } from "express";
import { signup, login } from "./auth.controller.js";
import { signupSchema, loginSchema } from "./auth.schema.js";
import { validate } from "../../middleware/validate.js";

const router = Router();

router.post("/signup", validate(signupSchema), signup);
router.post("/login", validate(loginSchema), login);

export default router;
