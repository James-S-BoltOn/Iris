import DatabaseConstructor from "better-sqlite3";
import type Database from "better-sqlite3";
import { initializeSchema } from "./schema.js";

let db: Database.Database | null = null;

/** Get or create the SQLite database connection */
export function getDb(): Database.Database {
  if (!db) {
    const dbPath = process.env.DATABASE_PATH ?? "iris.db";
    db = new DatabaseConstructor(dbPath);
    db.pragma("journal_mode = WAL");
    initializeSchema(db);
  }
  return db;
}

/** Close the database connection (for graceful shutdown) */
export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}
