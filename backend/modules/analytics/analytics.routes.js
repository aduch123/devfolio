import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware.js";
import { validate } from "../../middleware/validate.js";
import { engagementLimiter } from "../../middleware/rateLimit.js";
import { rangeSchema, viewSchema, clickSchema } from "./analytics.schema.js";
import {
  resolveAnalyticsPortfolio,
  recordView,
  recordClick,
  engagement,
  likePortfolio,
} from "./engagement.controller.js";
import {
  summary,
  timeseries,
  breakdown,
  clickBreakdown,
  activity,
} from "./analytics.controller.js";
const router = Router();
for (const base of ["/portfolio/:username", "/portfolio/share/:token"]) {
  router.post(
    `${base}/view`,
    engagementLimiter,
    validate(viewSchema),
    resolveAnalyticsPortfolio,
    recordView,
  );
  router.post(
    `${base}/click`,
    engagementLimiter,
    validate(clickSchema),
    resolveAnalyticsPortfolio,
    recordClick,
  );
  router.get(`${base}/engagement`, engagementLimiter, resolveAnalyticsPortfolio, engagement);
  router.post(`${base}/like`, engagementLimiter, resolveAnalyticsPortfolio, likePortfolio);
  router.delete(`${base}/like`, engagementLimiter, resolveAnalyticsPortfolio, likePortfolio);
}
for (const [path, handler] of [
  ["summary", summary],
  ["timeseries", timeseries],
  ["sources", breakdown],
  ["devices", breakdown],
  ["clicks", clickBreakdown],
])
  router.get(`/analytics/${path}`, requireAuth, validate(rangeSchema, "query"), handler);
router.get("/activity", requireAuth, activity);
export default router;
