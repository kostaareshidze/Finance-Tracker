# FinanceOS — Personal Finance Tracker

A full-stack personal finance web app built with Node.js + Express + SQLite + vanilla JS.

---

## Features

- **Income & Expense Tracking** — add, edit, delete transactions with category, date, amount, description
- **Monthly Dashboard** — income/expense stats, bar chart, spending pie chart, recent transactions
- **Yearly Statistics** — monthly trend chart with income, expenses, net savings line
- **Budgets** — set per-category monthly budgets with progress bars and warnings
- **Custom Categories** — predefined categories + create your own with icons and colors
- **Search & Filter** — filter transactions by date range, category, type, or text search
- **CSV Export** — export filtered transactions to CSV
- **Dark/Light Mode** — toggleable, persisted to localStorage
- **Authentication** — register/login with JWT tokens, currency selection per user
- **Currency Support** — USD, EUR, GBP, JPY, CAD, AUD, GEL
- **Responsive** — works on mobile and desktop

---

## Tech Stack

| Layer     | Technology             |
|-----------|------------------------|
| Frontend  | HTML, CSS, Vanilla JS, Chart.js |
| Backend   | Node.js, Express       |
| Database  | SQLite (via better-sqlite3) |
| Auth      | JWT + bcryptjs         |

---

## Project Structure

```
finance-app/
├── backend/
│   ├── server.js          # Express entry point
│   ├── db.js              # SQLite setup & schema
│   ├── auth.js            # JWT middleware
│   ├── package.json
│   └── routes/
│       ├── auth.js        # /api/auth/*
│       ├── transactions.js# /api/transactions/*
│       ├── categories.js  # /api/categories/*
│       └── budgets.js     # /api/budgets/*
└── frontend/
    ├── index.html
    ├── css/
    │   └── style.css
    └── js/
        ├── api.js         # fetch wrapper
        ├── auth.js        # login/register UI
        ├── app.js         # navigation, state
        ├── dashboard.js
        ├── transactions.js
        ├── budgets.js
        ├── yearly.js
        └── categories.js
```

---

## Database Schema

```sql
-- Users
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  currency TEXT DEFAULT 'USD',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Categories (default + custom per user)
CREATE TABLE categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  name TEXT NOT NULL,
  type TEXT CHECK(type IN ('income','expense','both')) DEFAULT 'both',
  color TEXT DEFAULT '#6366f1',
  icon TEXT DEFAULT '📦',
  is_default INTEGER DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Transactions
CREATE TABLE transactions (
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

-- Budgets (per user, category, month/year)
CREATE TABLE budgets (
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
```

---

## Setup Instructions

### Prerequisites
- **Node.js** v18 or higher — download from https://nodejs.org
- No database setup needed — SQLite file is created automatically

### Step 1 — Install dependencies

```bash
cd finance-app/backend
npm install
```

### Step 2 — Start the server

```bash
npm start
```

Or with auto-restart on file changes (development):
```bash
npm run dev
```

### Step 3 — Open the app

Open your browser and go to:
```
http://localhost:3001
```

### Step 4 — Create an account

Register with any username and password (min 6 chars), pick your currency, and start tracking!

**Demo account** (auto-created on first run):
- Username: `demo`
- Password: `demo1234`

> Note: The demo account is NOT auto-created. Just register with those credentials the first time.

---

## Environment Variables (optional)

Create a `.env` file in `backend/` to customize:

```env
PORT=3001
JWT_SECRET=your_custom_secret_here
```

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | /api/auth/register | Create account |
| POST | /api/auth/login | Login |
| GET | /api/transactions | List transactions (filterable) |
| POST | /api/transactions | Create transaction |
| PUT | /api/transactions/:id | Update transaction |
| DELETE | /api/transactions/:id | Delete transaction |
| GET | /api/transactions/summary/monthly | Monthly stats |
| GET | /api/transactions/summary/yearly | Yearly stats |
| GET | /api/transactions/export/csv | Download CSV |
| GET | /api/categories | List categories |
| POST | /api/categories | Create category |
| DELETE | /api/categories/:id | Delete custom category |
| GET | /api/budgets | List budgets with spending |
| POST | /api/budgets | Set/update budget |
| DELETE | /api/budgets/:id | Delete budget |
