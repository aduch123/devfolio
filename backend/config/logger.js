import pino from "pino";
import { env } from "./env.js";

const logger = pino({
  ...(env.NODE_ENV === "production" || env.NODE_ENV === "test"
    ? {}
    : { transport: { target: "pino-pretty", options: { colorize: true } } }),
  ...(env.NODE_ENV === "test" ? { level: "silent" } : {}),
  // Request URLs may contain private share or verification tokens.
  redact: [
    "req.url",
    "req.query",
    "req.params",
    "req.headers.cookie",
    "req.headers.authorization",
    'res.headers["set-cookie"]',
  ],
});
export default logger;
