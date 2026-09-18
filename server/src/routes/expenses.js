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

/** GET /api/expenses — newest first, with the total the UI needs anyway. */
expensesRouter.get("/", async (_req, res, next) => {
  try {
    const expenses = await Expense.find().sort({ date: -1, createdAt: -1 });
    const totalPaise = expenses.reduce((sum, e) => sum + e.amountPaise, 0);
    res.json({ expenses, totalPaise, count: expenses.length });
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

/** DELETE /api/expenses/:id */
expensesRouter.delete("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;

    // Without this check an unparseable id throws a CastError and reads as a
    // 500 — a malformed id is the caller's mistake, not the server's.
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: "Expense id is not valid" });
    }

    const deleted = await Expense.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ error: "Expense not found" });

    res.json({ id, deleted: true });
  } catch (error) {
    next(error);
  }
});

export { CATEGORIES };
