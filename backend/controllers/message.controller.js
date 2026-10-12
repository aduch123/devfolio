import { z } from "zod";
import prisma from "../config/prisma.js";
import { sendContactEmail } from "../utils/mailer.js";

const messageSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  message: z.string().min(1),
});

async function resolveRecipient(req) {
  if (req.params.username) {
    return prisma.user.findUnique({
      where: { username: req.params.username },
      select: { email: true, profile: { select: { contactEmail: true } } },
    });
  }
  if (req.params.token) {
    return prisma.user.findUnique({
      where: { shareToken: req.params.token },
      select: { email: true, profile: { select: { contactEmail: true } } },
    });
  }
  return null;
}

export const sendContactMessage = async (req, res) => {
  const result = messageSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: result.error.flatten() });
  }

  const recipient = await resolveRecipient(req);
  if (!recipient) {
    return res.status(404).json({ error: "Portfolio not found" });
  }

  const to = recipient.profile?.contactEmail || recipient.email;

  await sendContactEmail({
    to,
    senderName: result.data.name,
    senderEmail: result.data.email,
    message: result.data.message,
  });

  res.status(200).json({ success: true });
};