import { Hono } from "hono";
import type { ElevenLabsWebhookPayload } from "../types/index.js";
import { getDb } from "../db/index.js";
import { analyzeTranscript } from "../services/transcript.js";
import { sendNotification } from "../services/notification.js";

const webhook = new Hono();

/** POST /webhook/call-complete - receives data from ElevenLabs after each call */
webhook.post("/call-complete", async (c) => {
  const payload = await c.req.json<ElevenLabsWebhookPayload>();

  // Ignore failed calls
  if (payload.status === "failed") {
    console.warn(
      `Call ${payload.conversation_id} failed, skipping processing.`
    );
    return c.json({ status: "skipped", reason: "call_failed" });
  }

  // Analyze the transcript
  const analysis = analyzeTranscript(payload.transcript);

  // Persist to database
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO calls (caller_number, caller_name, summary, urgency, action_requested, transcript, duration_seconds)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const result = stmt.run(
    payload.caller_id ?? "unknown",
    analysis.caller_name,
    analysis.summary,
    analysis.urgency,
    analysis.action_requested,
    JSON.stringify(payload.transcript),
    payload.call_duration_secs
  );

  // Send notification
  await sendNotification({
    caller_name: analysis.caller_name,
    caller_number: payload.caller_id ?? "unknown",
    summary: analysis.summary,
    urgency: analysis.urgency,
    action_requested: analysis.action_requested,
    timestamp: new Date().toISOString(),
  });

  return c.json({
    status: "processed",
    call_id: result.lastInsertRowid,
  });
});

export default webhook;
