import type { NotificationPayload } from "../types/index.js";

/**
 * Send a notification about a completed call.
 *
 * V1: Logs to console. Will be replaced with a real notification
 * channel (Pushover, Slack, ntfy.sh, or SMS via Twilio).
 */
export async function sendNotification(
  payload: NotificationPayload
): Promise<void> {
  const urgencyEmoji =
    payload.urgency === "high"
      ? "[!!!]"
      : payload.urgency === "medium"
        ? "[!!]"
        : "[!]";

  const message = [
    `${urgencyEmoji} Missed call from ${payload.caller_name ?? payload.caller_number}`,
    `Summary: ${payload.summary}`,
    payload.action_requested
      ? `Action requested: ${payload.action_requested}`
      : null,
    `Time: ${payload.timestamp}`,
  ]
    .filter(Boolean)
    .join("\n");

  // TODO: Replace with actual notification channel
  console.log("--- NOTIFICATION ---");
  console.log(message);
  console.log("--------------------");
}
