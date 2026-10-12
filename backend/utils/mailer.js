import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendContactEmail({ to, senderName, senderEmail, message }) {
  await resend.emails.send({
    from: "Portfolio Contact <onboarding@resend.dev>",
    to,
    replyTo: senderEmail,
    subject: `New message from ${senderName}`,
    text: `From: ${senderName} (${senderEmail})\n\n${message}`,
  });
}