const express = require("express");
const { getDb } = require("../db");
const { authMiddleware } = require("../middleware/auth");
const router = express.Router();

router.use(authMiddleware);

router.get("/", (req, res) => {
  try {
    const db = getDb();
    const { year, month } = req.query;
    const y = year || new Date().getFullYear();
    const m = month || new Date().getMonth() + 1;

    const budgets = db
      .prepare(
        `
      SELECT b.*, c.name, c.color, c.icon,
        COALESCE((
          SELECT SUM(t.amount) FROM transactions t
          WHERE t.user_id=b.user_id AND t.category_id=b.category_id
            AND t.type='expense'
            AND strftime('%Y', t.date)=? AND strftime('%m', t.date)=?
        ), 0) as spent
      FROM budgets b
      LEFT JOIN categories c ON b.category_id=c.id
      WHERE b.user_id=? AND b.year=? AND b.month=?
    `,
      )
      .all(
        String(y),
        String(m).padStart(2, "0"),
        req.userId,
        parseInt(y),
        parseInt(m),
      );

    res.json(budgets);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/", (req, res) => {
  try {
    const { category_id, month, year, amount } = req.body;
    const db = getDb();
    db.prepare(
      `
      INSERT INTO budgets (user_id, category_id, month, year, amount)
      VALUES (?,?,?,?,?)
      ON CONFLICT(user_id, category_id, month, year) DO UPDATE SET amount=excluded.amount
    `,
    ).run(
      req.userId,
      category_id,
      parseInt(month),
      parseInt(year),
      parseFloat(amount),
    );

    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.delete("/:id", (req, res) => {
  try {
    const db = getDb();
    db.prepare("DELETE FROM budgets WHERE id=? AND user_id=?").run(
      req.params.id,
      req.userId,
    );
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
