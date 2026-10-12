import { ACCESS_COOKIE, REFRESH_COOKIE } from "../config/constants.js";
import { unauthorized } from "../utils/AppError.js";
import { verifyAccessToken } from "../utils/session.js";

// Returns the access-token payload ({ id, username, sid }) or null. Never throws.
export const readAccessUser = (req) => {
  const token = req.cookies?.[ACCESS_COOKIE];
  if (!token) return null;
  try {
    return verifyAccessToken(token);
  } catch {
    return null;
  }
};

export const requireAuth = (req, res, next) => {
  const user = readAccessUser(req);
  if (!user) {
    // INVALID_TOKEN also covers an expired access token: the client should call /auth/refresh.
    throw req.cookies?.[ACCESS_COOKIE]
      ? unauthorized("Invalid or expired token", "INVALID_TOKEN")
      : unauthorized("Please log in");
  }
  req.user = user;
  next();
};

// For HTML page routes: serve the page when the visitor has (or can refresh) a session, otherwise
// redirect to login. The page's own script still verifies the session with GET /auth/me.
export const requirePage = (req, res, next) => {
  if (readAccessUser(req) || req.cookies?.[REFRESH_COOKIE]) return next();
  res.redirect(302, "/login");
};
