import app from "./app.js";
import prisma from "./config/prisma.js";
import logger from "./config/logger.js";
import { env } from "./config/env.js";
import { APP_NAME } from "./config/constants.js";
import { startJobs } from "./jobs/cleanup.js";

let stopJobs = () => {};
const server = app.listen(env.PORT, () => {
  logger.info({ port: env.PORT }, `${APP_NAME} server started`);
  process.send?.("ready");
  if (env.NODE_ENV !== "test") stopJobs = startJobs();
});
server.headersTimeout = 10000;
server.requestTimeout = 60000;
server.keepAliveTimeout = 5000;
server.maxRequestsPerSocket = 100;
let shuttingDown = false;
async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  app.locals.shuttingDown = true;
  stopJobs();
  logger.info({ signal }, "Graceful shutdown started");
  const deadline = setTimeout(() => {
    server.closeAllConnections();
    process.exit(1);
  }, 15000);
  deadline.unref();
  server.close(async (error) => {
    try {
      await prisma.$disconnect();
      clearTimeout(deadline);
      process.exit(error ? 1 : 0);
    } catch {
      process.exit(1);
    }
  });
  server.closeIdleConnections();
}
process.once("SIGTERM", () => void shutdown("SIGTERM"));
process.once("SIGINT", () => void shutdown("SIGINT"));
server.on("error", (error) => {
  logger.fatal({ code: error.code }, "Server failed to listen");
  process.exitCode = 1;
});
