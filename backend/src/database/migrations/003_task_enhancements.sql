-- Task enhancements: fields + agile buckets
-- Migration: 003_task_enhancements

ALTER TABLE project_tasks ADD COLUMN task_uid TEXT;
ALTER TABLE project_tasks ADD COLUMN attachments TEXT NOT NULL DEFAULT '[]';
ALTER TABLE project_tasks ADD COLUMN comments TEXT NOT NULL DEFAULT '[]';
ALTER TABLE project_tasks ADD COLUMN due_date TEXT;
ALTER TABLE project_tasks ADD COLUMN reminder_date TEXT;
ALTER TABLE project_tasks ADD COLUMN tags TEXT NOT NULL DEFAULT '[]';
ALTER TABLE project_tasks ADD COLUMN links TEXT NOT NULL DEFAULT '[]';

CREATE UNIQUE INDEX IF NOT EXISTS idx_project_tasks_uid ON project_tasks(task_uid);
