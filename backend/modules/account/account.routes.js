import { Router } from "express";
import { changePassword, changeEmail, changeUsername, deleteAccount } from "./account.controller.js";
import {
  changePasswordSchema,
  changeEmailSchema,
  changeUsernameSchema,
  deleteAccountSchema,
} from "./account.schema.js";
import { validate } from "../../middleware/validate.js";
import { requireAuth } from "../../middleware/auth.middleware.js";
import { accountLimiter } from "../../middleware/rateLimit.js";

const router = Router();

router.use((req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});

router.use(requireAuth, accountLimiter);

router.post("/password", validate(changePasswordSchema), changePassword);
router.post("/email", validate(changeEmailSchema), changeEmail);
router.post("/username", validate(changeUsernameSchema), changeUsername);
router.post("/delete", validate(deleteAccountSchema), deleteAccount);

export default router;
