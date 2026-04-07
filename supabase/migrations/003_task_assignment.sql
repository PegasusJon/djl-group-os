-- Migration 003: Task assignment to specific users + one-off tasks

-- Assign a task to a specific user (optional — null means all eligible store members see it)
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES users(id);

-- One-off tasks auto-deactivate after a single completion
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS one_off BOOLEAN DEFAULT FALSE;

-- Index for faster per-user task lookups
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_store_id    ON tasks(store_id);
