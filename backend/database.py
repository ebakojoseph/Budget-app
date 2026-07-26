import sqlite3
import os

DB_PATH = "budget.db"

def init_db():
  if not os.path.exists(DB_PATH):
    conn = sqlite3.connect(DB_PATH)
    with open("schema.sql", "r") as f:
      conn.executescript(f.read())
    conn.close()

def get_db():
  conn = sqlite3.connect(DB_PATH)
  conn.row_factory = sqlite3.Row
  return conn
