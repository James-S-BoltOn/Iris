import { Hono } from "hono";
import { getDb } from "../db/index.js";
import type { CallRecord } from "../types/index.js";

const calls = new Hono();

/** Verify bearer token for call log access */
function isAuthorized(authHeader: string | undefined): boolean {
  const token = process.env.CALLS_API_TOKEN;
  if (!token) return false; // No token configured — deny by default
  if (!authHeader) return false;
  const bearer = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7)
    : authHeader;
  return bearer === token;
}

/** GET /calls - list recent calls */
calls.get("/", (c) => {
  if (!isAuthorized(c.req.header("authorization"))) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const db = getDb();
  const rows = db
    .prepare(
      `SELECT id, conversation_id, caller_number, caller_name, summary, urgency, action_requested, duration_seconds, notification_sent, created_at
       FROM calls ORDER BY created_at DESC LIMIT 50`
    )
    .all() as CallRecord[];

  return c.json(rows);
});

/** GET /calls/:id - get a single call with full transcript */
calls.get("/:id", (c) => {
  if (!isAuthorized(c.req.header("authorization"))) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const id = c.req.param("id");
  const db = getDb();
  const row = db.prepare(`SELECT * FROM calls WHERE id = ?`).get(id) as
    | CallRecord
    | undefined;

  if (!row) {
    return c.json({ error: "Call not found" }, 404);
  }

  return c.json(row);
});

export default calls;
