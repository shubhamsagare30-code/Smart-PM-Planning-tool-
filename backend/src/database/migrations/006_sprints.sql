-- Project sprints and task sprint assignment
-- Migration: 006_sprints

CREATE TABLE IF NOT EXISTS project_sprints (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  duration_weeks INTEGER NOT NULL CHECK (duration_weeks IN (1, 2)),
  status TEXT NOT NULL DEFAULT 'planned'
    CHECK (status IN ('planned', 'active', 'closed')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_project_sprints_project ON project_sprints(project_id);

ALTER TABLE project_tasks ADD COLUMN sprint_id INTEGER REFERENCES project_sprints(id);
ALTER TABLE standup_parking_items ADD COLUMN task_id INTEGER REFERENCES project_tasks(id);
