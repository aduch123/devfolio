import bcrypt from "bcrypt";
import prisma from "../../config/prisma.js";
import logger from "../../config/logger.js";
import { REFRESH_COOKIE, REFRESH_REUSE_GRACE_MS, REFRESH_TOKEN_TTL_MS } from "../../config/constants.js";
import { conflict, unauthorized } from "../../utils/AppError.js";
import { isUniqueViolation } from "../../utils/prismaErrors.js";
import {
  buildRefreshToken,
  clearAuthCookies,
  newRefreshSecret,
  parseRefreshToken,
  safeEqual,
  setAccessCookie,
  setRefreshCookie,
  sha256,
  signAccessToken,
} from "../../utils/session.js";

const publicUser = (user) => ({
  id: user.id,
  email: user.email,
  username: user.username,
  onboardingComplete: user.onboardingComplete,
});

// Creates a session row and sets both cookies. Returns the access token.
const startSession = async (req, res, user) => {
  const secret = newRefreshSecret();
  const session = await prisma.session.create({
    data: {
      userId: user.id,
      refreshHash: sha256(secret),
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
      userAgent: (req.get("user-agent") || "").slice(0, 200) || null,
    },
    select: { id: true },
  });
  setRefreshCookie(res, buildRefreshToken(session.id, secret));
  const accessToken = signAccessToken(user, session.id);
  setAccessCookie(res, accessToken);
  return accessToken;
};

export const signup = async (req, res) => {
  const { email, username, password } = req.body;

  const existingUser = await prisma.user.findFirst({
    where: { OR: [{ email }, { username }] },
  });

  if (existingUser) {
    throw conflict("Email or username already in use", "USER_EXISTS");
  }

  const passwordHash = await bcrypt.hash(password, 10);

  let user;
  try {
    user = await prisma.user.create({
      data: {
        email,
        username,
        passwordHash,
        profile: { create: {} },
      },
      select: { id: true, email: true, username: true },
    });
  } catch (err) {
    if (isUniqueViolation(err)) {
      throw conflict("Email or username already in use", "USER_EXISTS");
    }
    throw err;
  }

  res.status(201).json({ user });
};

export const login = async (req, res) => {
  const { email, password } = req.body;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw unauthorized("Invalid email or password", "INVALID_CREDENTIALS");
  }

  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) {
    throw unauthorized("Invalid email or password", "INVALID_CREDENTIALS");
  }

  const accessToken = await startSession(req, res, user);

  res.status(200).json({
    // TEMPORARY (removed in 1.2): the old frontend still reads the token from the body.
    token: accessToken,
    user: publicUser(user),
  });
};

export const refresh = async (req, res) => {
  const reject = (code, message) => {
    clearAuthCookies(res);
    throw unauthorized(message, code);
  };

  const parsed = parseRefreshToken(req.cookies?.[REFRESH_COOKIE]);
  if (!parsed) reject("NO_REFRESH_TOKEN", "Please log in");

  const load = () =>
    prisma.session.findUnique({
      where: { id: parsed.sessionId },
      include: { user: { select: { id: true, username: true } } },
    });

  const now = new Date();
  let session = await load();
  if (!session || session.revokedAt || session.expiresAt <= now) {
    reject("INVALID_REFRESH_TOKEN", "Your session has expired. Please log in again");
  }

  const hash = sha256(parsed.secret);

  if (safeEqual(hash, session.refreshHash)) {
    // Normal case: rotate. The compare-and-swap means only one of two simultaneous requests wins.
    const secret = newRefreshSecret();
    const rotated = await prisma.session.updateMany({
      where: { id: session.id, refreshHash: hash, revokedAt: null },
      data: {
        prevRefreshHash: hash,
        refreshHash: sha256(secret),
        rotatedAt: now,
        lastUsedAt: now,
        expiresAt: new Date(now.getTime() + REFRESH_TOKEN_TTL_MS),
      },
    });
    if (rotated.count === 1) {
      setRefreshCookie(res, buildRefreshToken(session.id, secret));
      setAccessCookie(res, signAccessToken(session.user, session.id));
      return res.status(204).end();
    }
    // Lost the race: someone just rotated or revoked this session. Look again and fall through.
    session = await load();
    if (!session || session.revokedAt) {
      reject("INVALID_REFRESH_TOKEN", "Your session has expired. Please log in again");
    }
  }

  if (session.prevRefreshHash && safeEqual(hash, session.prevRefreshHash)) {
    if (session.rotatedAt && now.getTime() - session.rotatedAt.getTime() <= REFRESH_REUSE_GRACE_MS) {
      // Another tab refreshed a moment ago and its cookie is already in the browser: only renew access.
      setAccessCookie(res, signAccessToken(session.user, session.id));
      return res.status(204).end();
    }
    // An old token came back after the grace window: treat the session as stolen and end it.
    await prisma.session.updateMany({
      where: { id: session.id, revokedAt: null },
      data: { revokedAt: now },
    });
    logger.warn({ sessionId: session.id, userId: session.userId }, "refresh token reuse detected; session revoked");
    reject("REFRESH_TOKEN_REUSED", "Your session has ended. Please log in again");
  }

  reject("INVALID_REFRESH_TOKEN", "Your session has expired. Please log in again");
};

export const logout = async (req, res) => {
  const now = new Date();
  const parsed = parseRefreshToken(req.cookies?.[REFRESH_COOKIE]);

  if (parsed) {
    const hash = sha256(parsed.secret);
    await prisma.session.updateMany({
      where: {
        id: parsed.sessionId,
        revokedAt: null,
        OR: [{ refreshHash: hash }, { prevRefreshHash: hash }],
      },
      data: { revokedAt: now },
    });
  }

  clearAuthCookies(res);
  res.status(204).end();
};

export const me = async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (!user) {
    clearAuthCookies(res);
    throw unauthorized("Please log in");
  }
  res.status(200).json({ user: publicUser(user) });
};
