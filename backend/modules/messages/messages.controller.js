import prisma from "../../config/prisma.js";
import { notFound } from "../../utils/AppError.js";
import { sendContactEmail } from "../../utils/mailer.js";

async function resolveRecipient(req) {
  if (req.params.username) {
    return prisma.user.findUnique({
      where: { username: req.params.username.toLowerCase(), deletedAt: null },
      select: { email: true, profile: { select: { contactEmail: true } } },
    });
  }
  if (req.params.token) {
    return prisma.user.findUnique({
      where: { shareToken: req.params.token, deletedAt: null },
      select: { email: true, profile: { select: { contactEmail: true } } },
    });
  }
  return null;
}

export const sendContactMessage = async (req, res) => {
  const recipient = await resolveRecipient(req);
  if (!recipient) {
    throw notFound("Portfolio not found", "PORTFOLIO_NOT_FOUND");
  }

  const to = recipient.profile?.contactEmail || recipient.email;

  await sendContactEmail({
    to,
    senderName: req.body.name,
    senderEmail: req.body.email,
    message: req.body.message,
  });

  res.status(200).json({ success: true });
};
