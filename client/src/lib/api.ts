/**
 * Everything that talks to the API lives here, so a component never builds a
 * URL or decodes an error shape itself.
 */

export type Expense = {
  id: string;
  amountPaise: number;
  description: string;
  category: Category;
  date: string;
  createdAt: string;
};

export const CATEGORIES = [
  "Food",
  "Transport",
  "Housing",
  "Utilities",
  "Health",
  "Shopping",
  "Other",
] as const;

export type Category = (typeof CATEGORIES)[number];

export type NewExpense = {
  amount: string;
  description: string;
  category: Category;
  date: string;
};

const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    // The API always sends { error }, so surface that rather than a status code.
    throw new Error(body?.error ?? `Request failed (${response.status})`);
  }

  return body as T;
}

export function listExpenses() {
  return request<{ expenses: Expense[]; totalPaise: number; count: number }>(
    "/api/expenses",
  );
}

export function createExpense(expense: NewExpense) {
  return request<Expense>("/api/expenses", {
    method: "POST",
    body: JSON.stringify(expense),
  });
}

export function deleteExpense(id: string) {
  return request<{ id: string; deleted: boolean }>(`/api/expenses/${id}`, {
    method: "DELETE",
  });
}

/** Paise in, rupees out. One place, so the rounding is always the same. */
export function formatRupees(paise: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(paise / 100);
}

export function formatDate(iso: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}
