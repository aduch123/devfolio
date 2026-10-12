import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware.js";
import { validate } from "../../middleware/validate.js";
import {
  getTimeline,
  createTimelineItem,
  updateTimelineItem,
  deleteTimelineItem,
  reorderTimeline,
} from "./timeline.controller.js";
import {
  timelineSchema,
  timelineUpdateSchema,
  timelineQuerySchema,
  timelineOrderSchema,
} from "./timeline.schema.js";

const router = Router();

router.get("/timeline", requireAuth, validate(timelineQuerySchema, "query"), getTimeline);
router.post("/timeline", requireAuth, validate(timelineSchema), createTimelineItem);
router.put("/timeline/order", requireAuth, validate(timelineOrderSchema), reorderTimeline);
router.patch("/timeline/:id", requireAuth, validate(timelineUpdateSchema), updateTimelineItem);
router.delete("/timeline/:id", requireAuth, deleteTimelineItem);

export default router;
