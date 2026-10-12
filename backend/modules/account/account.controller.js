import bcrypt from "bcrypt";
import prisma from "../../config/prisma.js";
import logger from "../../config/logger.js";
import { EMAIL_VERIFY_TTL_MS } from "../../config/constants.js";
import { badRequest, conflict, forbidden, unauthorized } from "../../utils/AppError.js";
import { isUniqueViolation } from "../../utils/prismaErrors.js";
import { appUrl, createEmailToken } from "../../utils/emailTokens.js";
import { sendVerificationEmail } from "../../utils/mailer.js";
import { clearAuthCookies, setAccessCookie, signAccessToken } from "../../utils/session.js";

const accountUser = (user) => ({
  id: user.id,
  email: user.email,
  username: user.username,
  onboardingComplete: user.onboardingComplete,
  emailVerified: Boolean(user.emailVerifiedAt),
});

// Loads the logged-in account and checks the password. A wrong password is 403 WRONG_PASSWORD,
// not 401, so the client does not mistake it for an expired session and redirect to login.
async function loadWithPassword(req, password) {
  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (!user || user.deletedAt) throw unauthorized("Please log in");
  if (!(await bcrypt.compare(password, user.passwordHash))) {
    throw forbidden("Current password is incorrect", "WRONG_PASSWORD");
  }
  return user;
}

export const changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = await loadWithPassword(req, currentPassword);
  if (currentPassword === newPassword) {
    throw badRequest("Choose a password different from the current one", undefined, "SAME_PASSWORD");
  }
  const passwordHash = await bcrypt.hash(newPassword, 10);
  // Every other session ends; this one stays logged in.
  await prisma.$transaction([
    prisma.user.update({ where: { id: user.id }, data: { passwordHash } }),
    prisma.session.updateMany({
      where: { userId: user.id, revokedAt: null, id: { not: req.user.sid } },
      data: { revokedAt: new Date() },
    }),
  ]);
  res.status(204).end();
};

export const changeEmail = async (req, res) => {
  const { password, email } = req.body;
  const user = await loadWithPassword(req, password);
  if (email === user.email) {
    throw badRequest("That is already your email", undefined, "SAME_EMAIL");
  }

  let updated;
  try {
    updated = await prisma.user.update({
      where: { id: user.id },
      data: { email, emailVerifiedAt: null },
    });
  } catch (err) {
    if (isUniqueViolation(err)) throw conflict("Email already in use", "EMAIL_EXISTS");
    throw err;
  }

  // Verify the new address; a failed send is only logged (the user can ask for another email).
  createEmailToken(updated.id, "VERIFY_EMAIL", EMAIL_VERIFY_TTL_MS)
    .then((token) =>
      sendVerificationEmail({
        to: updated.email,
        username: updated.username,
        link: `${appUrl()}/verify-email?token=${encodeURIComponent(token)}`,
      })
    )
    .catch((err) => logger.error({ err, userId: updated.id }, "could not send verification email"));

  res.status(200).json({ user: accountUser(updated) });
};

export const changeUsername = async (req, res) => {
  const { username } = req.body;
  let updated;
  try {
    updated = await prisma.user.update({ where: { id: req.user.id }, data: { username } });
  } catch (err) {
    if (isUniqueViolation(err)) throw conflict("Username already in use", "USERNAME_EXISTS");
    throw err;
  }
  // The access token carries the username: issue a fresh one. The old public URL now returns 404.
  setAccessCookie(res, signAccessToken(updated, req.user.sid));
  res.status(200).json({ user: accountUser(updated) });
};

export const deleteAccount = async (req, res) => {
  const user = await loadWithPassword(req, req.body.password);
  const now = new Date();
  await prisma.$transaction([
    prisma.user.update({ where: { id: user.id }, data: { deletedAt: now } }),
    prisma.session.updateMany({ where: { userId: user.id, revokedAt: null }, data: { revokedAt: now } }),
  ]);
  clearAuthCookies(res);
  res.status(204).end();
};
