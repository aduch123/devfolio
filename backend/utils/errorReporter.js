import logger from "../config/logger.js";
import { env } from "../config/env.js";
export function createErrorReporter({
  notify = async () => {},
  log = () => {},
  now = Date.now,
  threshold = 5,
  windowMs = 60000,
  cooldownMs = 300000,
} = {}) {
  let start = now(),
    count = 0,
    last = -Infinity;
  return ({ requestId } = {}) => {
    const time = now();
    if (time - start >= windowMs) {
      start = time;
      count = 0;
    }
    count++;
    if (count < threshold || time - last < cooldownMs) return;
    last = time;
    const event = {
      event: "error_spike",
      count,
      windowSeconds: windowMs / 1000,
      ...(requestId ? { requestId } : {}),
    };
    log(event);
    try {
      Promise.resolve(notify(event)).catch(() =>
        logger.warn({ event: "error_alert_delivery_failed" }, "Error alert could not be delivered"),
      );
    } catch {
      logger.warn({ event: "error_alert_delivery_failed" }, "Error alert could not be delivered");
    }
  };
}
export const reportServerError = createErrorReporter({
  log: (event) => logger.error(event, "Server error spike detected"),
  notify: async (event) => {
    if (!env.ERROR_WEBHOOK_URL) return;
    const response = await fetch(env.ERROR_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(event),
      signal: AbortSignal.timeout(3000),
    });
    if (!response.ok) throw Error("Alert rejected");
  },
});
