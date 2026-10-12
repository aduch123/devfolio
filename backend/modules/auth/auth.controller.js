import bcrypt from "bcrypt";
import prisma from "../../config/prisma.js";
import logger from "../../config/logger.js";
import {
  EMAIL_RESEND_COOLDOWN_MS,
  EMAIL_VERIFY_TTL_MS,
  REFRESH_COOKIE,
  REFRESH_REUSE_GRACE_MS,
  REFRESH_TOKEN_TTL_MS,
} from "../../config/constants.js";
import { conflict, unauthorized } from "../../utils/AppError.js";
import { isUniqueViolation } from "../../utils/prismaErrors.js";
import { usernameSchema } from "./auth.schema.js";
import { appUrl, consumeEmailToken, createEmailToken } from "../../utils/emailTokens.js";
import { sendVerificationEmail } from "../../utils/mailer.js";
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

// Compared against when the email is unknown, so a missing account costs the same time as a wrong password.
const DUMMY_HASH = bcrypt.hashSync("devfolio-dummy-password", 10);

const publicUser = (user) => ({
  id: user.id,
  email: user.email,
  username: user.username,
  onboardingComplete: user.onboardingComplete,
  emailVerified: Boolean(user.emailVerifiedAt),
});

// Creates a fresh verification token and emails the link. Never throws: callers do not wait for it,
// and a failed send only shows up in the logs (the user can ask for another email).
const sendVerification = async (user) => {
  try {
    const token = await createEmailToken(user.id, "VERIFY_EMAIL", EMAIL_VERIFY_TTL_MS);
    const link = `${appUrl()}/verify-email?token=${encodeURIComponent(token)}`;
    await sendVerificationEmail({ to: user.email, username: user.username, link });
  } catch (err) {
    logger.error({ err, userId: user.id }, "could not send verification email");
  }
};

// Creates a session row and sets both cookies (access and refresh).
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
  setAccessCookie(res, signAccessToken(user, session.id));
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

  sendVerification(user); // not awaited: signup does not wait for the email

  res.status(201).json({ user });
};

export const login = async (req, res) => {
  const { email, password } = req.body;

  const user = await prisma.user.findUnique({ where: { email } });
  const isValid = await bcrypt.compare(password, user ? user.passwordHash : DUMMY_HASH);
  if (!user || !isValid) {
    throw unauthorized("Invalid email or password", "INVALID_CREDENTIALS");
  }

  await startSession(req, res, user);

  res.status(200).json({ user: publicUser(user) });
};

// GET auth/username-available?username=abc -> { available, reason? } (reason: invalid, reserved, taken).
export const usernameAvailable = async (req, res) => {
  const parsed = usernameSchema.safeParse(typeof req.query.username === "string" ? req.query.username : "");
  if (!parsed.success) {
    const message = parsed.error.issues[0].message;
    const reason = message.includes("reserved") ? "reserved" : "invalid";
    return res.status(200).json({ available: false, reason, message });
  }
  const existing = await prisma.user.findUnique({ where: { username: parsed.data }, select: { id: true } });
  if (existing) {
    return res.status(200).json({ available: false, reason: "taken", message: "This username is already taken" });
  }
  res.status(200).json({ available: true });
};

// POST auth/verify-email { token }: the page posts the token from the link (a plain GET never consumes it).
export const verifyEmail = async (req, res) => {
  const { userId } = await consumeEmailToken(req.body.token, "VERIFY_EMAIL");
  await prisma.user.updateMany({ where: { id: userId, emailVerifiedAt: null }, data: { emailVerifiedAt: new Date() } });
  res.status(200).json({ verified: true });
};

// POST auth/resend-verification { email }: the same answer for every email, so it reveals nothing.
export const resendVerification = async (req, res) => {
  const user = await prisma.user.findUnique({ where: { email: req.body.email } });
  if (user && !user.emailVerifiedAt) {
    const latest = await prisma.emailToken.findFirst({
      where: { userId: user.id, type: "VERIFY_EMAIL" },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    });
    const coolingDown = latest && Date.now() - latest.createdAt.getTime() < EMAIL_RESEND_COOLDOWN_MS;
    if (!coolingDown) sendVerification(user);
  }
  res.status(202).json({ message: "If that account exists and is not verified yet, we sent a new link." });
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
