import { Resend } from "resend";
import { env } from "../config/env.js";
import logger from "../config/logger.js";
import { AppError } from "./AppError.js";

const resend = new Resend(env.RESEND_API_KEY);

const sendFailed = () =>
  new AppError(
    502,
    "EMAIL_SEND_FAILED",
    "We couldn't send your message right now. Please try again later.",
  );

// In tests nothing is sent: messages are collected here so tests can read the links in them.
export const testOutbox = [];

async function deliver(payload) {
  if (env.NODE_ENV === "test") {
    testOutbox.push(payload);
    return;
  }
  let result;
  try {
    result = await resend.emails.send({ from: env.RESEND_FROM, ...payload });
  } catch (err) {
    logger.error({ err }, "mailer: Resend request threw");
    throw sendFailed();
  }

  // The Resend SDK reports API failures in `error` instead of throwing.
  if (result?.error) {
    logger.error({ resendError: result.error }, "mailer: Resend rejected the email");
    throw sendFailed();
  }
}

export const sendContactEmail = ({ to, senderName, senderEmail, message }) =>
  deliver({
    to,
    replyTo: senderEmail,
    subject: `New message from ${senderName}`,
    text: `From: ${senderName} (${senderEmail})\n\n${message}`,
  });

export const sendPasswordResetEmail = ({ to, username, link }) =>
  deliver({
    to,
    subject: "Reset your Devfolio password",
    text: `Hi ${username},\n\nSomeone asked to reset the password for your Devfolio account. To choose a new one, open:\n\n${link}\n\nThis link works once and expires in 1 hour. If it wasn't you, ignore this email: your password stays the same.`,
  });

export const sendVerificationEmail = ({ to, username, link }) =>
  deliver({
    to,
    subject: "Verify your Devfolio email",
    text: `Hi ${username},\n\nConfirm your email address to finish setting up your Devfolio account:\n\n${link}\n\nThis link works once and expires in 24 hours. If you didn't create an account, ignore this email.`,
  });
