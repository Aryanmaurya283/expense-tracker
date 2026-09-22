import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { User } from "./lib/api";
import {
  AuthError,
  CATEGORIES,
  createExpense,
  deleteExpense,
  formatDate,
  formatRupees,
  listExpenses,
  updateExpense,
  type Category,
  type Expense,
  type Filters,
} from "./lib/api";
import "./App.css";

const today = () => new Date().toISOString().slice(0, 10);
const startOfMonth = () => today().slice(0, 8) + "01";

const emptyForm = {
  amount: "",
  description: "",
  category: "Food" as Category,
  date: today(),
};

export default function App({ user, onSignOut }: { user: User; onSignOut: () => void }) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [byCategory, setByCategory] = useState<Record<string, number>>({});
  const [totalPaise, setTotalPaise] = useState(0);

  const [form, setForm] = useState(emptyForm);
  const [filters, setFilters] = useState<Filters>({ category: "", q: "" });
  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState({ amount: "", description: "" });

  /** Debounce the search box so a keystroke isn't a request. */
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(
      () => setFilters((f) => ({ ...f, q: search.trim() })),
      280,
    );
    return () => window.clearTimeout(timer.current);
  }, [search]);

  const load = useCallback(async () => {
    try {
      setError(null);
      const data = await listExpenses(filters);
      setExpenses(data.expenses);
      setByCategory(data.byCategory ?? {});
      setTotalPaise(data.totalPaise);
    } catch (e) {
      if (e instanceof AuthError) return onSignOut();
      setError(e instanceof Error ? e.message : "Could not load expenses");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    void load();
  }, [load]);

  const thisMonthPaise = useMemo(() => {
    const from = startOfMonth();
    return expenses
      .filter((e) => e.date.slice(0, 10) >= from)
      .reduce((sum, e) => sum + e.amountPaise, 0);
  }, [expenses]);

  const breakdown = useMemo(() => {
    const entries = Object.entries(byCategory).sort((a, b) => b[1] - a[1]);
    const max = entries[0]?.[1] ?? 1;
    return entries.map(([name, paise]) => ({ name, paise, share: paise / max }));
  }, [byCategory]);

  const filtering = Boolean(filters.category || filters.q);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await createExpense(form);
      setForm({ ...emptyForm, date: form.date });
      await load();
    } catch (e) {
      if (e instanceof AuthError) return onSignOut();
      setError(e instanceof Error ? e.message : "Could not save the expense");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setBusyId(id);
    setError(null);
    const previous = expenses;
    // Optimistic: the row goes immediately and comes back if the call fails.
    setExpenses((current) => current.filter((e) => e.id !== id));
    try {
      await deleteExpense(id);
      await load();
    } catch (e) {
      setExpenses(previous);
      if (e instanceof AuthError) return onSignOut();
      setError(e instanceof Error ? e.message : "Could not delete the expense");
    } finally {
      setBusyId(null);
    }
  }

  function startEdit(expense: Expense) {
    setEditing(expense.id);
    setDraft({
      amount: (expense.amountPaise / 100).toString(),
      description: expense.description,
    });
  }

  async function saveEdit(id: string) {
    setBusyId(id);
    setError(null);
    try {
      await updateExpense(id, {
        amount: draft.amount,
        description: draft.description,
      });
      setEditing(null);
      await load();
    } catch (e) {
      if (e instanceof AuthError) return onSignOut();
      setError(e instanceof Error ? e.message : "Could not update the expense");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="page">
      <header className="masthead">
        <div>
          <p className="eyebrow">Personal finance</p>
          <h1>Expense Tracker</h1>
          <p className="who">
            {user.name}
            <button type="button" className="link" onClick={onSignOut}>
              Sign out
            </button>
          </p>
        </div>
        <div className="totals">
          <div className="total">
            <span className="total-label">{filtering ? "Filtered total" : "Total spent"}</span>
            <span className="total-value">{formatRupees(totalPaise)}</span>
          </div>
          <div className="total secondary">
            <span className="total-label">This month</span>
            <span className="total-value small">{formatRupees(thisMonthPaise)}</span>
          </div>
          <div className="total secondary">
            <span className="total-label">Entries</span>
            <span className="total-value small">{expenses.length}</span>
          </div>
        </div>
      </header>

      {error ? (
        <p className="alert" role="alert">
          {error}
        </p>
      ) : null}

      <main className="layout">
        <div className="column">
          <section className="card">
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

          {breakdown.length > 0 ? (
            <section className="card">
              <h2>Where it goes</h2>
              <ul className="breakdown">
                {breakdown.map((b) => (
                  <li key={b.name}>
                    <div className="breakdown-head">
                      <span>{b.name}</span>
                      <span className="amount">{formatRupees(b.paise)}</span>
                    </div>
                    <div className="bar">
                      <div className="bar-fill" style={{ width: `${b.share * 100}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>

        <section className="card list-card">
          <div className="list-head">
            <h2>Expenses</h2>
            <input
              type="search"
              className="search"
              placeholder="Search descriptions…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="filters">
            <button
              type="button"
              className={`filter ${filters.category ? "" : "on"}`}
              onClick={() => setFilters((f) => ({ ...f, category: "" }))}
            >
              All
            </button>
            {CATEGORIES.map((c) => (
              <button
                key={c}
                type="button"
                className={`filter ${filters.category === c ? "on" : ""}`}
                onClick={() =>
                  setFilters((f) => ({ ...f, category: f.category === c ? "" : c }))
                }
              >
                {c}
              </button>
            ))}
          </div>

          {loading ? (
            <p className="muted">Loading…</p>
          ) : expenses.length === 0 ? (
            <div className="empty">
              <p>{filtering ? "Nothing matches that filter." : "No expenses yet."}</p>
              <p className="muted">
                {filtering
                  ? "Clear the filter to see everything."
                  : "Add the first one and it will appear here."}
              </p>
            </div>
          ) : (
            <ul className="expenses">
              {expenses.map((expense) => (
                <li key={expense.id}>
                  {editing === expense.id ? (
                    <form
                      className="edit"
                      onSubmit={(e) => {
                        e.preventDefault();
                        void saveEdit(expense.id);
                      }}
                    >
                      <input
                        type="text"
                        value={draft.description}
                        onChange={(e) =>
                          setDraft({ ...draft, description: e.target.value })
                        }
                        required
                      />
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        value={draft.amount}
                        onChange={(e) => setDraft({ ...draft, amount: e.target.value })}
                        required
                      />
                      <button type="submit" disabled={busyId === expense.id}>
                        Save
                      </button>
                      <button
                        type="button"
                        className="ghost"
                        onClick={() => setEditing(null)}
                      >
                        Cancel
                      </button>
                    </form>
                  ) : (
                    <>
                      <div className="expense-main">
                        <span className="description">{expense.description}</span>
                        <span className="meta">
                          <span className="tag">{expense.category}</span>
                          {formatDate(expense.date)}
                        </span>
                      </div>
                      <span className="amount">{formatRupees(expense.amountPaise)}</span>
                      <div className="actions">
                        <button
                          type="button"
                          className="ghost"
                          onClick={() => startEdit(expense)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="delete"
                          aria-label={`Delete ${expense.description}`}
                          disabled={busyId === expense.id}
                          onClick={() => handleDelete(expense.id)}
                        >
                          {busyId === expense.id ? "…" : "Delete"}
                        </button>
                      </div>
                    </>
                  )}
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
