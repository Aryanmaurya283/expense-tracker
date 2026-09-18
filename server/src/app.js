import cors from "cors";
import express from "express";
import { expensesRouter, CATEGORIES } from "./routes/expenses.js";

export function createApp() {
  const app = express();

  // Only the origins we name may call this API. A deployed front end sets
  // CORS_ORIGIN; local development falls back to the Vite dev server.
  const origins = (process.env.CORS_ORIGIN ?? "http://localhost:5173")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);

  app.use(cors({ origin: origins.includes("*") ? true : origins }));
  app.use(express.json({ limit: "16kb" }));

  // Render and friends ping this to decide whether the service is alive.
  app.get("/api/health", (_req, res) =>
    res.json({ ok: true, categories: CATEGORIES }),
  );

  app.use("/api/expenses", expensesRouter);

  app.use((_req, res) => res.status(404).json({ error: "Route not found" }));

  // One error handler, so no route ever leaks a stack trace to a client.
  app.use((error, _req, res, _next) => {
    if (error?.name === "ValidationError") {
      const message = Object.values(error.errors)
        .map((e) => e.message)
        .join(", ");
      return res.status(400).json({ error: message });
    }
    console.error(error);
    res.status(500).json({ error: "Something went wrong" });
  });

  return app;
}
