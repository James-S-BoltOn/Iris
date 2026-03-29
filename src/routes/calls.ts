import { Hono } from "hono";
import { getDb } from "../db/index.js";
import type { CallRecord } from "../types/index.js";

const calls = new Hono();

/** GET /calls - list recent calls */
calls.get("/", (c) => {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT id, caller_number, caller_name, summary, urgency, action_requested, duration_seconds, created_at
       FROM calls ORDER BY created_at DESC LIMIT 50`
    )
    .all() as CallRecord[];

  return c.json(rows);
});

/** GET /calls/:id - get a single call with full transcript */
calls.get("/:id", (c) => {
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
