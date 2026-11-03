import cron from "node-cron";
import prisma from "../config/prisma.js";
import logger from "../config/logger.js";
import { runLinkChecks } from "../modules/health/health.service.js";
let scheduledRunning = false;
export function startHealthJobs() {
  return cron.schedule(
    "0 4 * * *",
    async () => {
      if (scheduledRunning) return;
      scheduledRunning = true;
      try {
        const users = await prisma.user.findMany({
          where: { deletedAt: null, profile: { published: true } },
          select: { id: true },
        });
        for (const user of users)
          try {
            await runLinkChecks(user.id);
          } catch (error) {
            logger.error({ code: error.code }, "Scheduled portfolio check failed");
          }
      } catch (error) {
        logger.error({ code: error.code }, "Scheduled health batch failed");
      } finally {
        scheduledRunning = false;
      }
    },
    { timezone: "UTC" },
  );
}
