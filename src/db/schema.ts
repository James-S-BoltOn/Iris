import type Database from "better-sqlite3";

/** Create the calls table if it doesn't exist */
export function initializeSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS calls (
      id                INTEGER PRIMARY KEY AUTOINCREMENT,
      conversation_id   TEXT    NOT NULL UNIQUE,
      caller_number     TEXT    NOT NULL,
      caller_name       TEXT,
      summary           TEXT    NOT NULL,
      urgency           TEXT    NOT NULL CHECK (urgency IN ('low', 'medium', 'high')),
      action_requested  TEXT,
      transcript        TEXT    NOT NULL,
      duration_seconds  INTEGER NOT NULL,
      notification_sent INTEGER NOT NULL DEFAULT 0,
      created_at        TEXT    NOT NULL DEFAULT (datetime('now'))
    )
  `);
}
