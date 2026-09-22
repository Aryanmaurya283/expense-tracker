import { useState } from "react";
import { login, register, setToken, type User } from "./lib/api";

/**
 * Sign in or create an account. One screen, one toggle — an app this size
 * doesn't need two routes, and the fewer steps between arriving and using it,
 * the better.
 */
export default function Auth({ onDone }: { onDone: (user: User) => void }) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const registering = mode === "register";

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const result = registering
        ? await register(form.name, form.email, form.password)
        : await login(form.email, form.password);
      setToken(result.token);
      onDone(result.user);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card card">
        <p className="eyebrow">Personal finance</p>
        <h1>Expense Tracker</h1>
        <p className="muted auth-lead">
          {registering
            ? "Create an account and your expenses stay yours."
            : "Sign in to see your expenses."}
        </p>

        {error ? (
          <p className="alert" role="alert">
            {error}
          </p>
        ) : null}

        <form onSubmit={submit}>
          {registering ? (
            <label>
              Name
              <input
                type="text"
                required
                autoComplete="name"
                maxLength={60}
                placeholder="Aryan Maurya"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </label>
          ) : null}

          <label>
            Email
            <input
              type="email"
              required
              autoComplete="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </label>

          <label>
            Password
            <input
              type="password"
              required
              minLength={registering ? 8 : undefined}
              autoComplete={registering ? "new-password" : "current-password"}
              placeholder={registering ? "At least 8 characters" : "••••••••"}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </label>

          <button type="submit" disabled={busy}>
            {busy ? "Please wait…" : registering ? "Create account" : "Sign in"}
          </button>
        </form>

        <p className="auth-switch muted">
          {registering ? "Already have an account?" : "New here?"}{" "}
          <button
            type="button"
            className="link"
            onClick={() => {
              setMode(registering ? "login" : "register");
              setError(null);
            }}
          >
            {registering ? "Sign in" : "Create an account"}
          </button>
        </p>
      </div>
    </div>
  );
}
