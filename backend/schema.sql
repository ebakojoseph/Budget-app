CREATE TABLE IF NOT EXISTS accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  "group" TEXT NOT NULL,
  balance REAL NOT NULL DEFAULT 0,
  brought_forward REAL NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- 'expense' | 'income'
  planned REAL NOT NULL DEFAULT 0,
  month TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  amount REAL NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  type TEXT NOT NULL, -- 'expense' | 'income' | 'transfer'
  month TEXT NOT NULL,
  account_id INTEGER,
  to_account_id INTEGER
);

CREATE TABLE IF NOT EXISTS allocations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  percent REAL NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS balance_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  account_id INTEGER NOT NULL,
  month TEXT NOT NULL,
  balance REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS budgets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  month TEXT NOT NULL,
  name TEXT NOT NULL,
  share_token TEXT,
  share_write INTEGER
);
