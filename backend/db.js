const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, 'finance.db');

let db;

function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initSchema();
  }
  return db;
}

function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      currency TEXT DEFAULT 'USD',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      name TEXT NOT NULL,
      type TEXT CHECK(type IN ('income','expense','both')) DEFAULT 'both',
      color TEXT DEFAULT '#6366f1',
      icon TEXT DEFAULT '📦',
      is_default INTEGER DEFAULT 0,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      type TEXT CHECK(type IN ('income','expense')) NOT NULL,
      amount REAL NOT NULL,
      category_id INTEGER,
      description TEXT,
      date TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS budgets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      category_id INTEGER NOT NULL,
      month INTEGER NOT NULL,
      year INTEGER NOT NULL,
      amount REAL NOT NULL,
      UNIQUE(user_id, category_id, month, year),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON transactions(user_id, date);
    CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category_id);
  `);

  seedDefaultCategories();
}

function seedDefaultCategories() {
  const count = db.prepare('SELECT COUNT(*) as c FROM categories WHERE is_default=1').get();
  if (count.c > 0) return;

  const defaults = [
    { name: 'Salary',        type: 'income',  color: '#10b981', icon: '💼' },
    { name: 'Freelance',     type: 'income',  color: '#06b6d4', icon: '💻' },
    { name: 'Investments',   type: 'income',  color: '#8b5cf6', icon: '📈' },
    { name: 'Other Income',  type: 'income',  color: '#84cc16', icon: '💰' },
    { name: 'Food',          type: 'expense', color: '#f59e0b', icon: '🍔' },
    { name: 'Transport',     type: 'expense', color: '#3b82f6', icon: '🚗' },
    { name: 'Bills',         type: 'expense', color: '#ef4444', icon: '🧾' },
    { name: 'Entertainment', type: 'expense', color: '#ec4899', icon: '🎬' },
    { name: 'Shopping',      type: 'expense', color: '#f97316', icon: '🛍️' },
    { name: 'Health',        type: 'expense', color: '#14b8a6', icon: '💊' },
    { name: 'Education',     type: 'expense', color: '#6366f1', icon: '📚' },
    { name: 'Rent',          type: 'expense', color: '#dc2626', icon: '🏠' },
    { name: 'Travel',        type: 'expense', color: '#0ea5e9', icon: '✈️' },
    { name: 'Other',         type: 'both',    color: '#94a3b8', icon: '📦' },
  ];

  const insert = db.prepare(
    'INSERT INTO categories (name, type, color, icon, is_default) VALUES (?,?,?,?,1)'
  );
  const insertMany = db.transaction((cats) => {
    for (const c of cats) insert.run(c.name, c.type, c.color, c.icon);
  });
  insertMany(defaults);
}

module.exports = { getDb };
