const express = require("express");
const { getDb } = require("../db");
const { authMiddleware } = require("../middleware/auth");
const router = express.Router();

router.use(authMiddleware);

router.get("/", (req, res) => {
  try {
    const db = getDb();
    const cats = db
      .prepare(
        `
      SELECT * FROM categories
      WHERE is_default=1 OR user_id=?
      ORDER BY is_default DESC, name ASC
    `,
      )
      .all(req.userId);
    res.json(cats);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/", (req, res) => {
  try {
    const { name, type = "both", color = "#6366f1", icon = "📦" } = req.body;
    if (!name) return res.status(400).json({ error: "Name required" });
    const db = getDb();
    const result = db
      .prepare(
        "INSERT INTO categories (user_id, name, type, color, icon) VALUES (?,?,?,?,?)",
      )
      .run(req.userId, name, type, color, icon);
    const cat = db
      .prepare("SELECT * FROM categories WHERE id=?")
      .get(result.lastInsertRowid);
    res.json(cat);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.delete("/:id", (req, res) => {
  try {
    const db = getDb();
    const cat = db
      .prepare("SELECT * FROM categories WHERE id=? AND user_id=?")
      .get(req.params.id, req.userId);
    if (!cat)
      return res
        .status(404)
        .json({ error: "Not found or cannot delete default category" });
    db.prepare("DELETE FROM categories WHERE id=?").run(req.params.id);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
