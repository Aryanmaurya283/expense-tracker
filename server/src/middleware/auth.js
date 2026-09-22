import jwt from "jsonwebtoken";

const FALLBACK_SECRET = "dev-only-secret-change-me";

export function jwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (secret) return secret;

  // In production a missing secret means every token ever issued is forgeable,
  // so refuse to start rather than quietly signing with a known string.
  if (process.env.NODE_ENV === "production") {
    throw new Error("JWT_SECRET must be set in production");
  }
  return FALLBACK_SECRET;
}

export function signToken(userId) {
  return jwt.sign({ sub: userId }, jwtSecret(), { expiresIn: "7d" });
}

/**
 * Reads `Authorization: Bearer <token>` and puts the user id on the request.
 * Everything under /api/expenses sits behind this, so a request can only ever
 * reach one person's data.
 */
export function requireAuth(req, res, next) {
  const header = req.headers.authorization ?? "";
  const [scheme, token] = header.split(" ");

  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ error: "Sign in to continue" });
  }

  try {
    const payload = jwt.verify(token, jwtSecret());
    req.userId = payload.sub;
    next();
  } catch {
    // Expired and tampered tokens are the same thing to the caller: sign in again.
    res.status(401).json({ error: "Session expired — sign in again" });
  }
}
