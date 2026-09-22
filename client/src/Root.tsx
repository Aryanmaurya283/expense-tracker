import { useEffect, useState } from "react";
import App from "./App";
import Auth from "./Auth";
import { getToken, me, setToken, type User } from "./lib/api";
import "./App.css";

/**
 * Decides whether you see the app or the sign-in screen.
 *
 * A stored token is only a claim: it is checked against /api/auth/me before the
 * app renders, so an expired or revoked token lands on sign-in rather than on a
 * dashboard that fails one request at a time.
 */
export default function Root() {
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setChecking(false);
      return;
    }
    me()
      .then(({ user }) => setUser(user))
      .catch(() => setToken(null))
      .finally(() => setChecking(false));
  }, []);

  function signOut() {
    setToken(null);
    setUser(null);
  }

  if (checking) {
    return (
      <div className="auth-page">
        <p className="muted">Loading…</p>
      </div>
    );
  }

  if (!user) return <Auth onDone={setUser} />;

  return <App user={user} onSignOut={signOut} />;
}
