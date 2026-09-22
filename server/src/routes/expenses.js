import { Router } from "express";
import mongoose from "mongoose";
import { Expense } from "../models/expense.js";

export const expensesRouter = Router();

const CATEGORIES = [
  "Food",
  "Transport",
  "Housing",
  "Utilities",
  "Health",
  "Shopping",
  "Other",
];

/**
 * Money arrives from the client as a decimal string or number of rupees and is
 * stored as integer paise. Parsing here, once, keeps every other layer free of
 * float arithmetic.
 */
function toPaise(amount) {
  if (amount === undefined || amount === null || amount === "") return null;
  const value = Number(amount);
  if (!Number.isFinite(value) || value <= 0) return null;
  return Math.round(value * 100);
}

/** A user's search text is not a regular expression until it is made safe. */
function escapeRegex(input) {
  return String(input).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * GET /api/expenses — newest first, with the totals the UI needs anyway.
 *
 * Optional filters: ?category=Food&from=2026-09-01&to=2026-09-30&q=metro
 * Totals cover the filtered set, because a total that ignores the filter in
 * front of it is worse than no total at all.
 */
expensesRouter.get("/", async (req, res, next) => {
  try {
    const { category, from, to, q } = req.query;
    const filter = { userId: req.userId };

    if (category && CATEGORIES.includes(category)) filter.category = category;

    if (from || to) {
      const range = {};
      if (from && !Number.isNaN(Date.parse(from))) range.$gte = new Date(from);
      if (to && !Number.isNaN(Date.parse(to))) range.$lte = new Date(to);
      if (Object.keys(range).length > 0) filter.date = range;
    }

    if (q && String(q).trim()) {
      filter.description = new RegExp(escapeRegex(String(q).trim()), "i");
    }

    const expenses = await Expense.find(filter).sort({ date: -1, createdAt: -1 });
    const totalPaise = expenses.reduce((sum, e) => sum + e.amountPaise, 0);

    // Per-category totals, so the client never recomputes what the server knows.
    const byCategory = {};
    for (const e of expenses) {
      byCategory[e.category] = (byCategory[e.category] ?? 0) + e.amountPaise;
    }

    res.json({ expenses, totalPaise, count: expenses.length, byCategory });
  } catch (error) {
    next(error);
  }
});

/** POST /api/expenses */
expensesRouter.post("/", async (req, res, next) => {
  try {
    const { amount, description, category, date } = req.body ?? {};

    const amountPaise = toPaise(amount);
    if (amountPaise === null) {
      return res
        .status(400)
        .json({ error: "Amount must be a number greater than zero" });
    }
    if (!description || !String(description).trim()) {
      return res.status(400).json({ error: "Description is required" });
    }
    if (!CATEGORIES.includes(category)) {
      return res
        .status(400)
        .json({ error: `Category must be one of: ${CATEGORIES.join(", ")}` });
    }

    const when = date ? new Date(date) : new Date();
    if (Number.isNaN(when.getTime())) {
      return res.status(400).json({ error: "Date is not valid" });
    }

    const expense = await Expense.create({
      userId: req.userId,
      amountPaise,
      description: String(description).trim(),
      category,
      date: when,
    });

    res.status(201).json(expense);
  } catch (error) {
    next(error);
  }
});

/** PATCH /api/expenses/:id — edit an expense in place. */
expensesRouter.patch("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: "Expense id is not valid" });
    }

    const { amount, description, category, date } = req.body ?? {};
    const update = {};

    if (amount !== undefined) {
      const amountPaise = toPaise(amount);
      if (amountPaise === null) {
        return res
          .status(400)
          .json({ error: "Amount must be a number greater than zero" });
      }
      update.amountPaise = amountPaise;
    }

    if (description !== undefined) {
      if (!String(description).trim()) {
        return res.status(400).json({ error: "Description cannot be empty" });
      }
      update.description = String(description).trim();
    }

    if (category !== undefined) {
      if (!CATEGORIES.includes(category)) {
        return res
          .status(400)
          .json({ error: `Category must be one of: ${CATEGORIES.join(", ")}` });
      }
      update.category = category;
    }

    if (date !== undefined) {
      const when = new Date(date);
      if (Number.isNaN(when.getTime())) {
        return res.status(400).json({ error: "Date is not valid" });
      }
      update.date = when;
    }

    if (Object.keys(update).length === 0) {
      return res.status(400).json({ error: "Nothing to update" });
    }

    const expense = await Expense.findOneAndUpdate({ _id: id, userId: req.userId }, update, {
      new: true,
      runValidators: true,
    });
    if (!expense) return res.status(404).json({ error: "Expense not found" });

    res.json(expense);
  } catch (error) {
    next(error);
  }
});

/** DELETE /api/expenses/:id */
expensesRouter.delete("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;

    // Without this check an unparseable id throws a CastError and reads as a
    // 500 — a malformed id is the caller's mistake, not the server's.
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: "Expense id is not valid" });
    }

    const deleted = await Expense.findOneAndDelete({ _id: id, userId: req.userId });
    if (!deleted) return res.status(404).json({ error: "Expense not found" });

    res.json({ id, deleted: true });
  } catch (error) {
    next(error);
  }
});

export { CATEGORIES };
