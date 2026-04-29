const express = require("express");
const { getDb } = require("../db");
const { authMiddleware } = require("../middleware/auth");
const router = express.Router();

router.use(authMiddleware);

// GET transactions with filters
router.get("/", (req, res) => {
  try {
    const db = getDb();
    const {
      start,
      end,
      category,
      type,
      search,
      page = 1,
      limit = 50,
    } = req.query;
    let sql = `
      SELECT t.*, c.name as category_name, c.color as category_color, c.icon as category_icon
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.user_id = ?
    `;
    const params = [req.userId];

    if (start) {
      sql += " AND t.date >= ?";
      params.push(start);
    }
    if (end) {
      sql += " AND t.date <= ?";
      params.push(end);
    }
    if (category) {
      sql += " AND t.category_id = ?";
      params.push(category);
    }
    if (type) {
      sql += " AND t.type = ?";
      params.push(type);
    }
    if (search) {
      sql += " AND (t.description LIKE ? OR c.name LIKE ?)";
      params.push(`%${search}%`, `%${search}%`);
    }

    // count total
    const countSql = sql.replace(
      "SELECT t.*, c.name as category_name, c.color as category_color, c.icon as category_icon",
      "SELECT COUNT(*) as total",
    );
    const { total } = db.prepare(countSql).get(...params);

    sql += " ORDER BY t.date DESC, t.id DESC LIMIT ? OFFSET ?";
    params.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));

    const rows = db.prepare(sql).all(...params);
    res.json({
      transactions: rows,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST create transaction
router.post("/", (req, res) => {
  try {
    const db = getDb();
    const { type, amount, category_id, description, date } = req.body;
    if (!type || !amount || !date)
      return res.status(400).json({ error: "type, amount, date required" });

    const result = db
      .prepare(
        "INSERT INTO transactions (user_id, type, amount, category_id, description, date) VALUES (?,?,?,?,?,?)",
      )
      .run(
        req.userId,
        type,
        parseFloat(amount),
        category_id || null,
        description || "",
        date,
      );

    const tx = db
      .prepare(
        `
      SELECT t.*, c.name as category_name, c.color as category_color, c.icon as category_icon
      FROM transactions t LEFT JOIN categories c ON t.category_id=c.id
      WHERE t.id=?
    `,
      )
      .get(result.lastInsertRowid);

    res.json(tx);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// PUT update transaction
router.put("/:id", (req, res) => {
  try {
    const db = getDb();
    const { type, amount, category_id, description, date } = req.body;
    const existing = db
      .prepare("SELECT id FROM transactions WHERE id=? AND user_id=?")
      .get(req.params.id, req.userId);
    if (!existing) return res.status(404).json({ error: "Not found" });

    db.prepare(
      "UPDATE transactions SET type=?, amount=?, category_id=?, description=?, date=? WHERE id=?",
    ).run(
      type,
      parseFloat(amount),
      category_id || null,
      description || "",
      date,
      req.params.id,
    );

    const tx = db
      .prepare(
        `
      SELECT t.*, c.name as category_name, c.color as category_color, c.icon as category_icon
      FROM transactions t LEFT JOIN categories c ON t.category_id=c.id
      WHERE t.id=?
    `,
      )
      .get(req.params.id);

    res.json(tx);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE transaction
router.delete("/:id", (req, res) => {
  try {
    const db = getDb();
    const result = db
      .prepare("DELETE FROM transactions WHERE id=? AND user_id=?")
      .run(req.params.id, req.userId);
    if (result.changes === 0)
      return res.status(404).json({ error: "Not found" });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET monthly summary
router.get("/summary/monthly", (req, res) => {
  try {
    const db = getDb();
    const { year, month } = req.query;
    const y = year || new Date().getFullYear();
    const m = String(month || new Date().getMonth() + 1).padStart(2, "0");
    const prefix = `${y}-${m}`;

    const summary = db
      .prepare(
        `
      SELECT
        SUM(CASE WHEN type='income' THEN amount ELSE 0 END) as total_income,
        SUM(CASE WHEN type='expense' THEN amount ELSE 0 END) as total_expense,
        COUNT(*) as count
      FROM transactions
      WHERE user_id=? AND date LIKE ?
    `,
      )
      .get(req.userId, `${prefix}%`);

    const byCategory = db
      .prepare(
        `
      SELECT c.name, c.color, c.icon, t.type,
        SUM(t.amount) as total, COUNT(*) as count
      FROM transactions t
      LEFT JOIN categories c ON t.category_id=c.id
      WHERE t.user_id=? AND t.date LIKE ?
      GROUP BY t.category_id, t.type
      ORDER BY total DESC
    `,
      )
      .all(req.userId, `${prefix}%`);

    res.json({ ...summary, by_category: byCategory, year: y, month: m });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET yearly summary
router.get("/summary/yearly", (req, res) => {
  try {
    const db = getDb();
    const { year } = req.query;
    const y = year || new Date().getFullYear();

    const monthly = db
      .prepare(
        `
      SELECT
        strftime('%m', date) as month,
        SUM(CASE WHEN type='income' THEN amount ELSE 0 END) as income,
        SUM(CASE WHEN type='expense' THEN amount ELSE 0 END) as expense
      FROM transactions
      WHERE user_id=? AND strftime('%Y', date)=?
      GROUP BY month
      ORDER BY month
    `,
      )
      .all(req.userId, String(y));

    const totals = db
      .prepare(
        `
      SELECT
        SUM(CASE WHEN type='income' THEN amount ELSE 0 END) as total_income,
        SUM(CASE WHEN type='expense' THEN amount ELSE 0 END) as total_expense
      FROM transactions
      WHERE user_id=? AND strftime('%Y', date)=?
    `,
      )
      .get(req.userId, String(y));

    // fill missing months
    const allMonths = Array.from({ length: 12 }, (_, i) => {
      const m = String(i + 1).padStart(2, "0");
      const found = monthly.find((r) => r.month === m);
      return {
        month: m,
        income: found?.income || 0,
        expense: found?.expense || 0,
      };
    });

    res.json({ year: y, months: allMonths, ...totals });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET CSV export
router.get("/export/csv", (req, res) => {
  try {
    const db = getDb();
    const { start, end } = req.query;
    let sql = `
      SELECT t.date, t.type, t.amount, c.name as category, t.description
      FROM transactions t LEFT JOIN categories c ON t.category_id=c.id
      WHERE t.user_id=?
    `;
    const params = [req.userId];
    if (start) {
      sql += " AND t.date >= ?";
      params.push(start);
    }
    if (end) {
      sql += " AND t.date <= ?";
      params.push(end);
    }
    sql += " ORDER BY t.date DESC";

    const rows = db.prepare(sql).all(...params);
    let csv = "Date,Type,Amount,Category,Description\n";
    rows.forEach((r) => {
      csv += `"${r.date}","${r.type}","${r.amount}","${r.category || ""}","${(r.description || "").replace(/"/g, '""')}"\n`;
    });

    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="transactions.csv"',
    );
    res.send(csv);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
