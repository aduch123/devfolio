import { ACCESS_COOKIE, REFRESH_COOKIE } from "../config/constants.js";
import { unauthorized } from "../utils/AppError.js";
import prisma from "../config/prisma.js";
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

// Checks the access cookie and, in the database, that its session is still live and the account is not
// deleted, so logout, password reset and account deletion cut access at once (not after 15 minutes).
export const requireAuth = async (req, res, next) => {
  const user = readAccessUser(req);
  if (!user) {
    // INVALID_TOKEN also covers an expired access token: the client should call /auth/refresh.
    throw req.cookies?.[ACCESS_COOKIE]
      ? unauthorized("Invalid or expired token", "INVALID_TOKEN")
      : unauthorized("Please log in");
  }
  const live = await prisma.session.findFirst({
    where: {
      id: user.sid,
      userId: user.id,
      revokedAt: null,
      expiresAt: { gt: new Date() },
      user: { deletedAt: null },
    },
    select: { id: true },
  });
  if (!live) throw unauthorized("Your session has ended. Please log in again", "SESSION_ENDED");
  req.user = user;
  next();
};

// For HTML page routes: serve the page when the visitor has (or can refresh) a session, otherwise
// redirect to login. The page's own script still verifies the session with GET /auth/me.
export const requirePage = (req, res, next) => {
  if (readAccessUser(req) || req.cookies?.[REFRESH_COOKIE]) return next();
  res.redirect(302, "/login");
};
