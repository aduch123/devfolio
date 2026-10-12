import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import {
  ACCESS_COOKIE,
  ACCESS_TOKEN_TTL_SECONDS,
  REFRESH_COOKIE,
  REFRESH_COOKIE_PATH,
  REFRESH_TOKEN_TTL_MS,
} from "../config/constants.js";

const baseCookie = {
  httpOnly: true,
  sameSite: "lax",
  secure: env.NODE_ENV === "production",
};

export const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");

export const safeEqual = (a, b) => {
  if (typeof a !== "string" || typeof b !== "string") return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB);
};

export const newRefreshSecret = () => crypto.randomBytes(32).toString("base64url");

// Refresh cookie value: "<sessionId>.<secret>". Only a hash of the secret is stored.
export const buildRefreshToken = (sessionId, secret) => `${sessionId}.${secret}`;

export const parseRefreshToken = (value) => {
  if (typeof value !== "string") return null;
  const dot = value.indexOf(".");
  if (dot < 1 || dot === value.length - 1) return null;
  return { sessionId: value.slice(0, dot), secret: value.slice(dot + 1) };
};

export const signAccessToken = (user, sessionId) =>
  jwt.sign({ id: user.id, username: user.username, sid: sessionId }, env.JWT_SECRET, {
    algorithm: "HS256",
    expiresIn: ACCESS_TOKEN_TTL_SECONDS,
  });

export const verifyAccessToken = (token) =>
  jwt.verify(token, env.JWT_SECRET, { algorithms: ["HS256"] });

// Page routes only need to know whose (possibly just expired) session this is: the signature must be
// valid, expiry is ignored, and the caller checks the session in the database.
export const decodeAccessToken = (token) =>
  jwt.verify(token, env.JWT_SECRET, { algorithms: ["HS256"], ignoreExpiration: true });

// The cookie outlives the 15-minute token inside it (an expired token is harmless and API calls still
// reject it). The refresh cookie only travels to /api/v1/auth, so this is how page routes such as
// /dashboard can still recognize a user whose access token just expired; the client then refreshes.
export const setAccessCookie = (res, accessToken) => {
  res.cookie(ACCESS_COOKIE, accessToken, {
    ...baseCookie,
    path: "/",
    maxAge: REFRESH_TOKEN_TTL_MS,
  });
};

export const setRefreshCookie = (res, refreshToken) => {
  res.cookie(REFRESH_COOKIE, refreshToken, {
    ...baseCookie,
    path: REFRESH_COOKIE_PATH,
    maxAge: REFRESH_TOKEN_TTL_MS,
  });
};

export const clearAuthCookies = (res) => {
  res.clearCookie(ACCESS_COOKIE, { ...baseCookie, path: "/" });
  res.clearCookie(REFRESH_COOKIE, { ...baseCookie, path: REFRESH_COOKIE_PATH });
};
