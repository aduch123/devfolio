import { env } from "../config/env.js";
import { forbidden } from "../utils/AppError.js";

const STATE_CHANGING = new Set(["POST", "PUT", "PATCH", "DELETE"]);

// Defense in depth on top of SameSite=Lax cookies: a state-changing request that carries an Origin
// header must come from this site (or an origin listed in CORS_ORIGINS). Requests without Origin
// (curl, server-to-server, tests) are not browser cross-site requests and pass.
export const originCheck = (req, res, next) => {
  if (!STATE_CHANGING.has(req.method)) return next();
  const origin = req.headers.origin;
  if (!origin) return next();

  let host;
  try {
    host = new URL(origin).host;
  } catch {
    throw forbidden("Request origin not allowed", "BAD_ORIGIN");
  }
  if (host === req.get("host") || env.CORS_ORIGINS.includes(origin)) return next();
  throw forbidden("Request origin not allowed", "BAD_ORIGIN");
};
