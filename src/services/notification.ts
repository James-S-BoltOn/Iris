import nodemailer from "nodemailer";
import type { NotificationPayload } from "../types/index.js";

const transporter = createTransporter();

function createTransporter(): nodemailer.Transporter | null {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) {
    console.warn(
      "SMTP credentials not set — notifications will log to console only."
    );
    return null;
  }
  return nodemailer.createTransport({
    host,
    port: parseInt(process.env.SMTP_PORT ?? "587", 10),
    secure: process.env.SMTP_SECURE === "true",
    auth: { user, pass },
  });
}

/**
 * Send an email notification about a completed call.
 * Falls back to console logging if SMTP is not configured.
 * Returns true if notification was delivered successfully.
 */
export async function sendNotification(
  payload: NotificationPayload
): Promise<boolean> {
  const urgencyTag =
    payload.urgency === "high"
      ? "[URGENT]"
      : payload.urgency === "medium"
        ? "[Iris]"
        : "[Iris - Low]";

  const subject = `${urgencyTag} Missed call from ${payload.caller_name ?? payload.caller_number}`;

  const lines = [
    `From: ${payload.caller_name ?? "Unknown"} (${payload.caller_number})`,
    `Re: ${payload.summary}`,
  ];

  if (payload.action_requested) {
    lines.push(`Action: ${payload.action_requested}`);
  }

  lines.push(`Time: ${payload.timestamp}`);

  const body = lines.join("\n");

  if (!transporter) {
    console.log("--- NOTIFICATION (console fallback) ---");
    console.log(`Subject: ${subject}`);
    console.log(body);
    console.log("---------------------------------------");
    return true;
  }

  const to = process.env.NOTIFY_EMAIL;
  if (!to) {
    console.error("NOTIFY_EMAIL not set — cannot send notification.");
    return false;
  }

  try {
    const result = await transporter.sendMail({
      from: process.env.SMTP_FROM ?? process.env.SMTP_USER,
      to,
      subject,
      text: body,
    });
    console.log(`Email sent: ${result.messageId}`);
    return true;
  } catch (err) {
    console.error("Failed to send email notification:", err);
    return false;
  }
}
