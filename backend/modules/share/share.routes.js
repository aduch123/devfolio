import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware.js";
import { validate } from "../../middleware/validate.js";
import { shareCreateSchema, shareUpdateSchema } from "./share.schema.js";
import {
  getShareQr,
  generateShareToken,
  revokeShareToken,
  getSharedPortfolio,
  getShareToken,
  createShareLink,
  listShareLinks,
  updateShareLink,
  revokeShareLink,
} from "./share.controller.js";
const router = Router();
router.get("/share-links/qr", requireAuth, getShareQr);
router.post("/share-links", requireAuth, validate(shareCreateSchema), createShareLink);
router.get("/share-links", requireAuth, listShareLinks);
router.patch("/share-links/:id", requireAuth, validate(shareUpdateSchema), updateShareLink);
router.delete("/share-links/:id", requireAuth, revokeShareLink);
router.post("/share", requireAuth, validate(shareCreateSchema), generateShareToken);
router.get("/share", requireAuth, getShareToken);
router.delete("/share", requireAuth, revokeShareToken);
router.get("/portfolio/share/:token", getSharedPortfolio);
export default router;
