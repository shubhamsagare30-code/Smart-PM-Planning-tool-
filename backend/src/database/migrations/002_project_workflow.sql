-- Project Workflow Enhancement
-- Migration: 002_project_workflow

ALTER TABLE projects ADD COLUMN duration_days INTEGER;
ALTER TABLE projects ADD COLUMN project_type TEXT NOT NULL DEFAULT 'fixed_cost';
ALTER TABLE projects ADD COLUMN monthly_rate REAL DEFAULT 0;
ALTER TABLE projects ADD COLUMN software_cost REAL NOT NULL DEFAULT 0;
ALTER TABLE projects ADD COLUMN hardware_cost REAL NOT NULL DEFAULT 0;
ALTER TABLE projects ADD COLUMN desk_cost REAL NOT NULL DEFAULT 0;
ALTER TABLE projects ADD COLUMN office_cost REAL NOT NULL DEFAULT 0;
ALTER TABLE projects ADD COLUMN planned_cost REAL NOT NULL DEFAULT 0;
ALTER TABLE projects ADD COLUMN actual_cost REAL NOT NULL DEFAULT 0;
ALTER TABLE projects ADD COLUMN documentation_links TEXT NOT NULL DEFAULT '[]';
ALTER TABLE projects ADD COLUMN documentation_files TEXT NOT NULL DEFAULT '[]';
ALTER TABLE projects ADD COLUMN external_board_url TEXT;
ALTER TABLE projects ADD COLUMN board_type TEXT NOT NULL DEFAULT 'internal';
ALTER TABLE projects ADD COLUMN planned_completion_percent REAL NOT NULL DEFAULT 0;
ALTER TABLE projects ADD COLUMN actual_completion_percent REAL NOT NULL DEFAULT 0;
ALTER TABLE projects ADD COLUMN deliverables_planned INTEGER NOT NULL DEFAULT 0;
ALTER TABLE projects ADD COLUMN deliverables_actual INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS project_tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'planned'
    CHECK (status IN ('planned', 'in_progress', 'delivered', 'blocked')),
  assignee_id INTEGER,
  planned_start TEXT,
  planned_end TEXT,
  actual_start TEXT,
  actual_end TEXT,
  planned_hours REAL NOT NULL DEFAULT 0,
  actual_hours REAL NOT NULL DEFAULT 0,
  kanban_column TEXT NOT NULL DEFAULT 'backlog',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (assignee_id) REFERENCES resources(id)
);

CREATE INDEX IF NOT EXISTS idx_project_tasks_project ON project_tasks(project_id);

CREATE TABLE IF NOT EXISTS time_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  resource_id INTEGER NOT NULL,
  log_date TEXT NOT NULL,
  hours REAL NOT NULL CHECK (hours > 0),
  description TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (resource_id) REFERENCES resources(id)
);

CREATE INDEX IF NOT EXISTS idx_time_logs_project ON time_logs(project_id);

CREATE TABLE IF NOT EXISTS resource_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  requesting_project_id INTEGER NOT NULL,
  source_project_id INTEGER,
  resource_id INTEGER NOT NULL,
  requested_allocation_percent INTEGER NOT NULL
    CHECK (requested_allocation_percent > 0 AND requested_allocation_percent <= 100),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  message TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (requesting_project_id) REFERENCES projects(id),
  FOREIGN KEY (source_project_id) REFERENCES projects(id),
  FOREIGN KEY (resource_id) REFERENCES resources(id)
);

CREATE INDEX IF NOT EXISTS idx_resource_requests_project ON resource_requests(requesting_project_id);
