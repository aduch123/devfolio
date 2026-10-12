import app from "./app.js";
import logger from "./config/logger.js";
import { env } from "./config/env.js";
import { APP_NAME } from "./config/constants.js";
import { startJobs } from "./jobs/cleanup.js";

app.listen(env.PORT, () => {
  logger.info(`${APP_NAME} server is running on port ${env.PORT}`);
  if (env.NODE_ENV !== "test") startJobs();
});
