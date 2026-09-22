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
const TOKEN_KEY = "expense-tracker-token";

export type User = { id: string; name: string; email: string };

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

/** Thrown on 401 so the app can drop straight back to the sign-in screen. */
export class AuthError extends Error {}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken();

  const response = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
  });

  const body = await response.json().catch(() => null);

  if (response.status === 401) {
    setToken(null);
    throw new AuthError(body?.error ?? "Sign in to continue");
  }

  if (!response.ok) {
    // The API always sends { error }, so surface that rather than a status code.
    throw new Error(body?.error ?? `Request failed (${response.status})`);
  }

  return body as T;
}

export function register(name: string, email: string, password: string) {
  return request<{ token: string; user: User }>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ name, email, password }),
  });
}

export function login(email: string, password: string) {
  return request<{ token: string; user: User }>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export function me() {
  return request<{ user: User }>("/api/auth/me");
}

export type Filters = {
  category?: Category | "";
  q?: string;
  from?: string;
  to?: string;
};

export type ExpenseList = {
  expenses: Expense[];
  totalPaise: number;
  count: number;
  byCategory: Record<string, number>;
};

export function listExpenses(filters: Filters = {}) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value) params.set(key, value);
  }
  const query = params.toString();
  return request<ExpenseList>(`/api/expenses${query ? `?${query}` : ""}`);
}

export function updateExpense(id: string, patch: Partial<NewExpense>) {
  return request<Expense>(`/api/expenses/${id}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
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
