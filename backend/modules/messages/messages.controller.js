import { resolveSharedUser } from "../share/share.controller.js";
import prisma from "../../config/prisma.js";
import logger from "../../config/logger.js";
import { env } from "../../config/env.js";
import { notFound } from "../../utils/AppError.js";
import { sendContactEmail } from "../../utils/mailer.js";
const recipientSelect = {
  id: true,
  username: true,
  email: true,
  profile: { select: { contactEmail: true, emailNotifications: true } },
};
export async function resolveMessageRecipient(req, res, next) {
  const recipient = req.params.username
    ? await prisma.user.findUnique({
        where: {
          username: req.params.username.toLowerCase(),
          deletedAt: null,
          profile: { published: true },
        },
        select: recipientSelect,
      })
    : await resolveSharedUser(req.params.token, recipientSelect);
  if (!recipient) throw notFound("Portfolio not found", "PORTFOLIO_NOT_FOUND");
  req.messageRecipient = recipient;
  next();
}
export const sendContactMessage = async (req, res) => {
  const recipient = req.messageRecipient;
  const message = await prisma.message.create({
    data: {
      userId: recipient.id,
      senderName: req.body.name,
      senderEmail: req.body.email,
      body: req.body.message,
      notificationState: recipient.profile?.emailNotifications === false ? "SKIPPED" : "PENDING",
    },
  });
  if (recipient.profile?.emailNotifications !== false) {
    try {
      await sendContactEmail({
        to: recipient.profile?.contactEmail || recipient.email,
        senderName: req.body.name,
        senderEmail: req.body.email,
        message: req.body.message,
        inboxUrl: `${env.APP_URL || `http://localhost:${env.PORT}`}/dashboard/messages`,
      });
      await prisma.message.update({
        where: { id: message.id },
        data: { notificationState: "SENT" },
      });
    } catch (err) {
      logger.warn(
        { messageId: message.id, code: err.code },
        "Contact notification failed; message preserved",
      );
      await prisma.message.update({
        where: { id: message.id },
        data: { notificationState: "FAILED" },
      });
    }
  }
  res.status(201).json({ success: true });
};
export const listMessages = async (req, res) => {
  const { page, status, q } = req.validatedQuery;
  const where = {
    userId: req.user.id,
    ...(status ? { status } : {}),
    ...(q
      ? {
          OR: ["senderName", "senderEmail", "body"].map((field) => ({
            [field]: { contains: q, mode: "insensitive" },
          })),
        }
      : {}),
  };
  const [messages, total, unread] = await prisma.$transaction([
    prisma.message.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (page - 1) * 20,
      take: 20,
    }),
    prisma.message.count({ where }),
    prisma.message.count({ where: { userId: req.user.id, status: "UNREAD" } }),
  ]);
  res
    .set("Cache-Control", "no-store")
    .json({ messages, total, page, pages: Math.ceil(total / 20), unread });
};
export const updateMessage = async (req, res) => {
  const result = await prisma.message.updateMany({
    where: { id: req.params.id, userId: req.user.id },
    data: req.body,
  });
  if (!result.count) throw notFound("Message not found", "MESSAGE_NOT_FOUND");
  res.status(204).send();
};
export const deleteMessage = async (req, res) => {
  const result = await prisma.message.deleteMany({
    where: { id: req.params.id, userId: req.user.id },
  });
  if (!result.count) throw notFound("Message not found", "MESSAGE_NOT_FOUND");
  res.status(204).send();
};
export const getMessagePreferences = async (req, res) =>
  res.set("Cache-Control", "no-store").json(
    await prisma.profile.findUnique({
      where: { userId: req.user.id },
      select: { emailNotifications: true },
    }),
  );
export const setMessagePreferences = async (req, res) =>
  res.json(
    await prisma.profile.update({
      where: { userId: req.user.id },
      data: req.body,
      select: { emailNotifications: true },
    }),
  );

export const unreadMessages = async (req, res) =>
  res.set("Cache-Control", "no-store").json({
    unread: await prisma.message.count({ where: { userId: req.user.id, status: "UNREAD" } }),
  });
