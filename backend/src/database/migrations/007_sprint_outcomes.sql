-- Sprint working days and completion outcomes
-- Migration: 007_sprint_outcomes

ALTER TABLE project_sprints ADD COLUMN working_days INTEGER;
ALTER TABLE project_sprints ADD COLUMN outcome TEXT CHECK (outcome IS NULL OR outcome IN ('success', 'partial', 'failed'));
