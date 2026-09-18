import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CATEGORIES,
  createExpense,
  deleteExpense,
  formatDate,
  formatRupees,
  listExpenses,
  type Category,
  type Expense,
} from "./lib/api";
import "./App.css";

const today = () => new Date().toISOString().slice(0, 10);

const emptyForm = {
  amount: "",
  description: "",
  category: "Food" as Category,
  date: today(),
};

export default function App() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const data = await listExpenses();
      setExpenses(data.expenses);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load expenses");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  /** Totals are derived, never stored — one source of truth for the number. */
  const totalPaise = useMemo(
    () => expenses.reduce((sum, e) => sum + e.amountPaise, 0),
    [expenses],
  );

  const biggestCategory = useMemo(() => {
    if (expenses.length === 0) return null;
    const byCategory = new Map<string, number>();
    for (const e of expenses) {
      byCategory.set(e.category, (byCategory.get(e.category) ?? 0) + e.amountPaise);
    }
    return [...byCategory.entries()].sort((a, b) => b[1] - a[1])[0];
  }, [expenses]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const created = await createExpense(form);
      // Prepend rather than refetch: the list is sorted newest first anyway.
      setExpenses((current) => [created, ...current]);
      setForm({ ...emptyForm, date: form.date });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save the expense");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setDeleting(id);
    setError(null);
    const previous = expenses;
    // Optimistic: the row goes immediately and comes back if the call fails.
    setExpenses((current) => current.filter((e) => e.id !== id));
    try {
      await deleteExpense(id);
    } catch (e) {
      setExpenses(previous);
      setError(e instanceof Error ? e.message : "Could not delete the expense");
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="page">
      <header className="masthead">
        <div>
          <p className="eyebrow">Personal finance</p>
          <h1>Expense Tracker</h1>
        </div>
        <div className="total">
          <span className="total-label">Total spent</span>
          <span className="total-value">{formatRupees(totalPaise)}</span>
          <span className="total-meta">
            {expenses.length} {expenses.length === 1 ? "expense" : "expenses"}
            {biggestCategory ? ` · most on ${biggestCategory[0]}` : ""}
          </span>
        </div>
      </header>

      {error ? (
        <p className="alert" role="alert">
          {error}
        </p>
      ) : null}

      <main className="layout">
        <section className="card form-card">
          <h2>Add an expense</h2>
          <form onSubmit={handleSubmit}>
            <label>
              Amount (₹)
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0.01"
                required
                placeholder="250"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
              />
            </label>

            <label>
              Description
              <input
                type="text"
                required
                maxLength={120}
                placeholder="Groceries for the week"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </label>

            <div className="row">
              <label>
                Category
                <select
                  value={form.category}
                  onChange={(e) =>
                    setForm({ ...form, category: e.target.value as Category })
                  }
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Date
                <input
                  type="date"
                  required
                  max={today()}
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                />
              </label>
            </div>

            <button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Add expense"}
            </button>
          </form>
        </section>

        <section className="card list-card">
          <h2>Expenses</h2>

          {loading ? (
            <p className="muted">Loading…</p>
          ) : expenses.length === 0 ? (
            <div className="empty">
              <p>No expenses yet.</p>
              <p className="muted">Add the first one and it will appear here.</p>
            </div>
          ) : (
            <ul className="expenses">
              {expenses.map((expense) => (
                <li key={expense.id}>
                  <div className="expense-main">
                    <span className="description">{expense.description}</span>
                    <span className="meta">
                      <span className="tag">{expense.category}</span>
                      {formatDate(expense.date)}
                    </span>
                  </div>
                  <span className="amount">{formatRupees(expense.amountPaise)}</span>
                  <button
                    type="button"
                    className="delete"
                    aria-label={`Delete ${expense.description}`}
                    disabled={deleting === expense.id}
                    onClick={() => handleDelete(expense.id)}
                  >
                    {deleting === expense.id ? "…" : "Delete"}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>

      <footer className="foot">
        MERN · React, Express, MongoDB, Node — built by Aryan Maurya
      </footer>
    </div>
  );
}
