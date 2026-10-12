import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import { catchAsync } from "../utils/catchAsync.js";
import {
  generateShareToken,
  revokeShareToken,
  getSharedPortfolio,
  getShareToken,
} from "../controllers/share.controller.js";

const router = Router();

router.post("/share", requireAuth, catchAsync(generateShareToken));
router.get("/share", requireAuth, catchAsync(getShareToken));
router.delete("/share", requireAuth, catchAsync(revokeShareToken));
router.get("/portfolio/share/:token", catchAsync(getSharedPortfolio));

export default router;