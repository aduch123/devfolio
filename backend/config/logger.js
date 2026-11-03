import pino from "pino";
import { env } from "./env.js";
export const LOG_REDACTIONS = [
  "req.url",
  "req.query",
  "req.params",
  "req.headers.cookie",
  "req.headers.authorization",
  'res.headers["set-cookie"]',
  "req.body",
  "password",
  "passwordHash",
  "token",
  "apiKey",
  "secret",
  "err.body",
];
export function createLogger({ mode = env.NODE_ENV, destination } = {}) {
  const options = {
    ...(mode === "production" || mode === "test" || destination
      ? {}
      : { transport: { target: "pino-pretty", options: { colorize: true } } }),
    level: mode === "test" ? "silent" : env.LOG_LEVEL,
    redact: LOG_REDACTIONS,
  };
  return destination ? pino(options, destination) : pino(options);
}
export default createLogger();
