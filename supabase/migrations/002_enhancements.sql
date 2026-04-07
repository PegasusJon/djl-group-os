-- ============================================================
-- Migration 002: Enhancements
-- ============================================================

-- Multi-store tech assignment (floating techs)
CREATE TABLE IF NOT EXISTS user_stores (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  store_id   UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  is_primary BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, store_id)
);

ALTER TABLE user_stores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "us_read"  ON user_stores FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "us_write" ON user_stores FOR ALL   USING (auth_role() IN ('owner','district_manager','manager'));

-- Teams webhook on stores (used by daily-report edge function)
ALTER TABLE stores ADD COLUMN IF NOT EXISTS teams_webhook_url TEXT;

-- Goal value type: 'number' or 'percentage'
ALTER TABLE goals ADD COLUMN IF NOT EXISTS value_type TEXT DEFAULT 'number'
  CHECK (value_type IN ('number','percentage'));

-- Self-assigned tasks: flag + no store restriction
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS self_assigned BOOLEAN DEFAULT FALSE;

-- Tasks: allow null store_id for personal tasks
-- (already nullable in original schema)
