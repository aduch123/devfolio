import { ACCESS_COOKIE } from "../config/constants.js";
import { unauthorized } from "../utils/AppError.js";
import { verifyAccessToken } from "../utils/session.js";

// Returns the access-token payload ({ id, username, sid }) or null. Never throws.
// TEMPORARY (removed in 1.2): a Bearer header is still accepted so the old frontend keeps working.
export const readAccessUser = (req) => {
  const bearer = req.headers.authorization?.startsWith("Bearer ") ? req.headers.authorization.slice(7) : null;
  const token = req.cookies?.[ACCESS_COOKIE] || bearer;
  if (!token) return null;
  try {
    return verifyAccessToken(token);
  } catch {
    return null;
  }
};

export const requireAuth = (req, res, next) => {
  const hasCredentials = Boolean(req.cookies?.[ACCESS_COOKIE] || req.headers.authorization);
  const user = readAccessUser(req);
  if (!user) {
    // INVALID_TOKEN also covers an expired access token: the client should call /auth/refresh.
    throw hasCredentials
      ? unauthorized("Invalid or expired token", "INVALID_TOKEN")
      : unauthorized("Please log in");
  }
  req.user = user;
  next();
};
