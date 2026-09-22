import cors from "cors";
import express from "express";
import { expensesRouter, CATEGORIES } from "./routes/expenses.js";
import { authRouter } from "./routes/auth.js";
import { requireAuth } from "./middleware/auth.js";

export function createApp() {
  const app = express();

  /**
   * CORS.
   *
   * Configured origins win. Any *.vercel.app is also allowed, because preview
   * deployments get a new hostname every push and chasing them by hand turns
   * every deploy into a debugging session. With nothing configured at all the
   * API stays open — this is a portfolio service, not a bank.
   */
  const configured = (process.env.CORS_ORIGIN ?? "")
    .split(",")
    .map((o) => o.trim().replace(/\/$/, ""))
    .filter(Boolean);

  app.use(
    cors({
      origin(origin, callback) {
        // Same-origin, curl and server-to-server requests send no Origin.
        if (!origin) return callback(null, true);
        if (configured.length === 0 || configured.includes("*")) {
          return callback(null, true);
        }
        const clean = origin.replace(/\/$/, "");
        if (configured.includes(clean)) return callback(null, true);
        if (/^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(clean)) {
          return callback(null, true);
        }
        if (/^http:\/\/localhost:\d+$/.test(clean)) return callback(null, true);
        return callback(new Error(`Origin ${origin} is not allowed`));
      },
    }),
  );

  app.use(express.json({ limit: "16kb" }));

  /** The base URL should explain itself rather than 404. */
  app.get("/", (_req, res) =>
    res.json({
      name: "Expense Tracker API",
      status: "ok",
      endpoints: {
        register: "POST /api/auth/register",
        login: "POST /api/auth/login",
        me: "GET /api/auth/me",
        list: "GET /api/expenses",
        create: "POST /api/expenses",
        remove: "DELETE /api/expenses/:id",
        health: "GET /api/health",
      },
      categories: CATEGORIES,
      repository: "https://github.com/Aryanmaurya283/expense-tracker",
    }),
  );

  app.get("/api", (_req, res) => res.redirect("/"));

  app.get("/api/health", (_req, res) =>
    res.json({ ok: true, categories: CATEGORIES }),
  );

  app.use("/api/auth", authRouter);

  // Everything below here needs an account.
  app.use("/api/expenses", requireAuth, expensesRouter);

  app.use((req, res) =>
    res.status(404).json({
      error: `No route for ${req.method} ${req.path}`,
      hint: "Try GET / for the list of endpoints",
    }),
  );

  // One error handler, so no route ever leaks a stack trace to a client.
  app.use((error, _req, res, _next) => {
    if (error?.name === "ValidationError") {
      const message = Object.values(error.errors)
        .map((e) => e.message)
        .join(", ");
      return res.status(400).json({ error: message });
    }
    if (error?.message?.startsWith("Origin ")) {
      return res.status(403).json({ error: error.message });
    }
    console.error(error);
    res.status(500).json({ error: "Something went wrong" });
  });

  return app;
}
