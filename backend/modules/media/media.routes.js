import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware.js";
import { uploadLimiter } from "../../middleware/rateLimit.js";
import { imageUpload, resumeUpload } from "../../middleware/upload.js";
import {
  uploadAvatar,
  deleteAvatar,
  uploadResume,
  deleteResume,
  uploadCover,
  deleteCover,
} from "./media.controller.js";

const router = Router();

router.post("/profile/avatar", requireAuth, uploadLimiter, imageUpload, uploadAvatar);
router.delete("/profile/avatar", requireAuth, deleteAvatar);
router.post("/profile/resume", requireAuth, uploadLimiter, resumeUpload, uploadResume);
router.delete("/profile/resume", requireAuth, deleteResume);
router.post("/projects/:id/cover", requireAuth, uploadLimiter, imageUpload, uploadCover);
router.delete("/projects/:id/cover", requireAuth, deleteCover);

export default router;
