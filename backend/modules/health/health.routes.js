import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../../middleware/auth.middleware.js";
import { validate } from "../../middleware/validate.js";
import { healthCheckLimiter } from "../../middleware/rateLimit.js";
import { notFound, tooMany } from "../../utils/AppError.js";
import prisma from "../../config/prisma.js";
import { activeChecks, buildHealthReport, startCheck } from "./health.service.js";
const router = Router();
router.get("/health/report", requireAuth, async (req, res) => {
  const report = await buildHealthReport(req.user.id);
  if (!report) throw notFound("Account not found");
  res.set("Cache-Control", "no-store").json(report);
});
router.post("/health/links/recheck", requireAuth, healthCheckLimiter, async (req, res) => {
  if (activeChecks.has(req.user.id)) return res.status(202).json({ running: true });
  if (activeChecks.size >= 10) throw tooMany("Link checks are busy. Please try again shortly.");
  startCheck(req.user.id);
  res.status(202).json({ running: true });
});
router.post(
  "/health/dismiss",
  requireAuth,
  validate(z.strictObject({ key: z.string().min(1).max(200) })),
  async (req, res) => {
    const data = { userId: req.user.id, key: req.body.key };
    await prisma.healthDismissal.upsert({ where: { userId_key: data }, create: data, update: {} });
    res.status(204).send();
  },
);
router.delete("/health/dismiss/:key", requireAuth, async (req, res) => {
  await prisma.healthDismissal.deleteMany({ where: { userId: req.user.id, key: req.params.key } });
  res.status(204).send();
});
export default router;
