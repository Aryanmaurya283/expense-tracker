import { Router } from "express";
import { User } from "../models/user.js";
import { requireAuth, signToken } from "../middleware/auth.js";

export const authRouter = Router();

const MIN_PASSWORD = 8;

/** POST /api/auth/register */
authRouter.post("/register", async (req, res, next) => {
  try {
    const { name, email, password } = req.body ?? {};

    if (!name || !String(name).trim()) {
      return res.status(400).json({ error: "Name is required" });
    }
    if (!email || !String(email).trim()) {
      return res.status(400).json({ error: "Email is required" });
    }
    if (!password || String(password).length < MIN_PASSWORD) {
      return res
        .status(400)
        .json({ error: `Password must be at least ${MIN_PASSWORD} characters` });
    }

    const normalised = String(email).trim().toLowerCase();
    const existing = await User.findOne({ email: normalised });
    if (existing) {
      return res.status(409).json({ error: "That email is already registered" });
    }

    const user = await User.create({
      name: String(name).trim(),
      email: normalised,
      passwordHash: await User.hashPassword(String(password)),
    });

    res.status(201).json({ token: signToken(user.id), user });
  } catch (error) {
    next(error);
  }
});

/** POST /api/auth/login */
authRouter.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body ?? {};
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    // The hash is `select: false`, so ask for it explicitly here and nowhere else.
    const user = await User.findOne({
      email: String(email).trim().toLowerCase(),
    }).select("+passwordHash");

    // One message for both failures: telling an attacker which half was wrong
    // turns a password guess into an account-enumeration tool.
    const ok = user ? await user.checkPassword(String(password)) : false;
    if (!ok) {
      return res.status(401).json({ error: "Email or password is incorrect" });
    }

    res.json({ token: signToken(user.id), user });
  } catch (error) {
    next(error);
  }
});

/** GET /api/auth/me — used on load to turn a stored token back into a session. */
authRouter.get("/me", requireAuth, async (req, res, next) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(401).json({ error: "Account no longer exists" });
    res.json({ user });
  } catch (error) {
    next(error);
  }
});
