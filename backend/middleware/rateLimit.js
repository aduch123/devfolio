import { rateLimit, ipKeyGenerator } from "express-rate-limit";
import { env } from "../config/env.js";
import { tooMany } from "../utils/AppError.js";

const MINUTE = 60 * 1000;

// Every limiter answers with the standard error shape (code RATE_LIMITED, HTTP 429).
const build = ({ windowMs, limit, message, keyGenerator }) =>
  rateLimit({
    windowMs,
    limit,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    skip: () => env.NODE_ENV === "test",
    ...(keyGenerator ? { keyGenerator } : {}),
    handler: (req, res, next) => next(tooMany(message)),
  });

// Whole API, per IP.
export const globalLimiter = build({
  windowMs: 15 * MINUTE,
  limit: 300,
  message: "Too many requests. Please slow down and try again in a few minutes.",
});

// Login and signup share one bucket per IP.
export const authLimiter = build({
  windowMs: 15 * MINUTE,
  limit: 10,
  message: "Too many login or signup attempts. Please wait 15 minutes and try again.",
});

// Silent token refresh: legitimate clients need only a few per 15 minutes.
export const refreshLimiter = build({
  windowMs: 15 * MINUTE,
  limit: 60,
  message: "Too many session refreshes. Please wait a few minutes and try again.",
});

// Contact form: per IP and per portfolio (username or share token).
export const contactLimiter = build({
  windowMs: 60 * MINUTE,
  limit: 5,
  message: "You have sent too many messages. Please try again in an hour.",
  keyGenerator: (req) => {
    const target = req.params.username ? `u:${req.params.username.toLowerCase()}` : `t:${req.params.token}`;
    return `${ipKeyGenerator(req.ip)}|${target}`;
  },
});
