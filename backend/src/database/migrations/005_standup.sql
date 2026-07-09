-- Daily standup sessions, decisions, parking lot
-- Migration: 005_standup

CREATE TABLE IF NOT EXISTS standup_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  session_date TEXT NOT NULL,
  notes TEXT,
  attendees TEXT NOT NULL DEFAULT '[]',
  duration_min INTEGER,
  created_by_user_id INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(project_id, session_date)
);

CREATE TABLE IF NOT EXISTS standup_decisions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER NOT NULL REFERENCES standup_sessions(id) ON DELETE CASCADE,
  decision TEXT NOT NULL,
  action TEXT,
  owner_name TEXT,
  due_date TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS standup_parking_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER NOT NULL REFERENCES standup_sessions(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  resolved INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_standup_sessions_project_date ON standup_sessions(project_id, session_date);
