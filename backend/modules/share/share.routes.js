import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware.js";
import {
  generateShareToken,
  revokeShareToken,
  getSharedPortfolio,
  getShareToken,
} from "./share.controller.js";

const router = Router();

router.post("/share", requireAuth, generateShareToken);
router.get("/share", requireAuth, getShareToken);
router.delete("/share", requireAuth, revokeShareToken);
router.get("/portfolio/share/:token", getSharedPortfolio);

export default router;
