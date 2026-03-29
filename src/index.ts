import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { logger } from "hono/logger";
import webhook from "./routes/webhook.js";
import calls from "./routes/calls.js";
import { closeDb } from "./db/index.js";

const app = new Hono();

// Middleware
app.use("*", logger());

// Routes
app.route("/webhook", webhook);
app.route("/calls", calls);

// Health check
app.get("/", (c) => {
  return c.json({ name: "Iris", status: "ok", version: "0.1.0" });
});

// Start server
const port = parseInt(process.env.PORT ?? "3000", 10);

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`Iris is listening on http://localhost:${info.port}`);
});

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("Shutting down...");
  closeDb();
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("Shutting down...");
  closeDb();
  process.exit(0);
});
