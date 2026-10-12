import { Resend } from "resend";
import { env } from "../config/env.js";
import logger from "../config/logger.js";
import { AppError } from "./AppError.js";

const resend = new Resend(env.RESEND_API_KEY);

const sendFailed = () =>
  new AppError(502, "EMAIL_SEND_FAILED", "We couldn't send your message right now. Please try again later.");

export async function sendContactEmail({ to, senderName, senderEmail, message }) {
  let result;
  try {
    result = await resend.emails.send({
      from: env.RESEND_FROM,
      to,
      replyTo: senderEmail,
      subject: `New message from ${senderName}`,
      text: `From: ${senderName} (${senderEmail})\n\n${message}`,
    });
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
