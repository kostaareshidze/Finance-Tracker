const express = require("express");
const router = express.Router();

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { getDb } = require("../db");
const { JWT_SECRET } = require("../config");
const { authMiddleware } = require("../middleware/auth");
/**
 * 🔐 JWT SECRET (move to .env later if you want)
 */

/**
 * 🔐 Auth Middleware
 */

/**
 * REGISTER
 */
router.post("/register", async (req, res) => {
  try {
    const { username, password, currency = "USD" } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: "Username and password required" });
    }

    if (password.length < 6) {
      return res.status(400).json({
        error: "Password must be at least 6 characters",
      });
    }

    const db = getDb();

    const exists = db
      .prepare("SELECT id FROM users WHERE username=?")
      .get(username);

    if (exists) {
      return res.status(409).json({ error: "Username already taken" });
    }

    const hash = await bcrypt.hash(password, 10);

    const result = db
      .prepare(
        "INSERT INTO users (username, password_hash, currency) VALUES (?,?,?)",
      )
      .run(username, hash, currency);

    const token = jwt.sign({ userId: result.lastInsertRowid }, JWT_SECRET, {
      expiresIn: "30d",
    });

    res.json({
      token,
      user: {
        id: result.lastInsertRowid,
        username,
        currency,
      },
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/**
 * LOGIN
 */
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    const db = getDb();

    const user = db
      .prepare("SELECT * FROM users WHERE username=?")
      .get(username);

    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const valid = await bcrypt.compare(password, user.password_hash);

    if (!valid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, {
      expiresIn: "30d",
    });

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        currency: user.currency,
      },
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/**
 * UPDATE CURRENCY (FIXED ROUTE)
 */
router.put("/currency", authMiddleware, (req, res) => {
  const { currency } = req.body;

  const db = getDb();

  db.prepare("UPDATE users SET currency=? WHERE id=?").run(
    currency,
    req.userId,
  );

  res.json({ success: true });
});

module.exports = router;
