-- ============================================================
-- DJL Group OS — Complete Database Schema
-- Run this in Supabase SQL Editor
-- ============================================================

-- Stores
CREATE TABLE IF NOT EXISTS stores (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  address    TEXT,
  phone      TEXT,
  timezone   TEXT DEFAULT 'America/New_York',
  active     BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Users (mirrors auth.users)
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email         TEXT UNIQUE NOT NULL,
  full_name     TEXT NOT NULL,
  role          TEXT NOT NULL CHECK (role IN ('owner','district_manager','manager','tech')),
  store_id      UUID REFERENCES stores(id),
  points_balance INT DEFAULT 0,
  active        BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Tasks
CREATE TABLE IF NOT EXISTS tasks (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title          TEXT NOT NULL,
  description    TEXT,
  instructions   TEXT,
  frequency      TEXT NOT NULL CHECK (frequency IN ('daily','weekly','biweekly','monthly','quarterly')),
  first_due_date DATE NOT NULL,
  store_id       UUID REFERENCES stores(id),
  assigned_role  TEXT,           -- null = all roles
  created_by     UUID REFERENCES users(id),
  active         BOOLEAN DEFAULT TRUE,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- Task Completions
CREATE TABLE IF NOT EXISTS task_completions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id          UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  completed_by     UUID NOT NULL REFERENCES users(id),
  store_id         UUID REFERENCES stores(id),
  note             TEXT,
  attachment_url   TEXT,
  early_completion BOOLEAN DEFAULT FALSE,
  completed_at     TIMESTAMPTZ DEFAULT NOW()
);

-- Goals
CREATE TABLE IF NOT EXISTS goals (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title         TEXT NOT NULL,
  description   TEXT,
  target_value  NUMERIC NOT NULL,
  current_value NUMERIC DEFAULT 0,
  unit          TEXT DEFAULT 'repairs',
  store_id      UUID REFERENCES stores(id),
  user_id       UUID REFERENCES users(id),
  due_date      DATE,
  created_by    UUID REFERENCES users(id),
  active        BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Rewards
CREATE TABLE IF NOT EXISTS rewards (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  description TEXT,
  cost        INT NOT NULL,
  active      BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Redemptions
CREATE TABLE IF NOT EXISTS redemptions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id),
  reward_id  UUID NOT NULL REFERENCES rewards(id),
  store_id   UUID REFERENCES stores(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Points Ledger
CREATE TABLE IF NOT EXISTS points_ledger (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id),
  points       INT NOT NULL,             -- positive = earned, negative = spent
  reason       TEXT NOT NULL,            -- 'task_completion' | 'early_completion' | 'redemption' | 'manual'
  reference_id UUID,                     -- task_completion.id or reward.id
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Knowledge Files
CREATE TABLE IF NOT EXISTS knowledge_files (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT NOT NULL,
  description TEXT,
  category    TEXT DEFAULT 'General',
  file_url    TEXT NOT NULL,
  file_name   TEXT,
  file_size   INT,
  uploaded_by UUID REFERENCES users(id),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- EOD Snapshots (for history baseline)
CREATE TABLE IF NOT EXISTS eod_snapshots (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id        UUID REFERENCES stores(id),
  snapshot_date   DATE NOT NULL,
  tasks_due       INT DEFAULT 0,
  tasks_completed INT DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(store_id, snapshot_date)
);

-- ============================================================
-- TRIGGER: Update points_balance after insert on points_ledger
-- ============================================================
CREATE OR REPLACE FUNCTION update_points_balance()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE users
  SET points_balance = points_balance + NEW.points
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_update_points_balance ON points_ledger;
CREATE TRIGGER trg_update_points_balance
  AFTER INSERT ON points_ledger
  FOR EACH ROW EXECUTE FUNCTION update_points_balance();

-- ============================================================
-- RLS Policies
-- ============================================================
ALTER TABLE stores          ENABLE ROW LEVEL SECURITY;
ALTER TABLE users           ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks           ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals           ENABLE ROW LEVEL SECURITY;
ALTER TABLE rewards         ENABLE ROW LEVEL SECURITY;
ALTER TABLE redemptions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE points_ledger   ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE eod_snapshots   ENABLE ROW LEVEL SECURITY;

-- Helpers
CREATE OR REPLACE FUNCTION auth_role() RETURNS TEXT AS $$
  SELECT role FROM users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION auth_store() RETURNS UUID AS $$
  SELECT store_id FROM users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- Stores: all authenticated users can read
CREATE POLICY "stores_read"  ON stores FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "stores_write" ON stores FOR ALL   USING (auth_role() IN ('owner','district_manager'));

-- Users: own record or managers can see store members
CREATE POLICY "users_read_own"   ON users FOR SELECT USING (id = auth.uid() OR auth_role() IN ('owner','district_manager','manager'));
CREATE POLICY "users_write_own"  ON users FOR UPDATE USING (id = auth.uid() OR auth_role() IN ('owner','district_manager'));

-- Tasks: read by store members, write by managers+
CREATE POLICY "tasks_read"  ON tasks FOR SELECT USING (store_id = auth_store() OR auth_role() IN ('owner','district_manager'));
CREATE POLICY "tasks_write" ON tasks FOR ALL   USING (auth_role() IN ('owner','district_manager','manager'));

-- Task completions: read by store, insert by self
CREATE POLICY "tc_read"   ON task_completions FOR SELECT USING (store_id = auth_store() OR auth_role() IN ('owner','district_manager'));
CREATE POLICY "tc_insert" ON task_completions FOR INSERT WITH CHECK (completed_by = auth.uid());

-- Goals: same store
CREATE POLICY "goals_read"  ON goals FOR SELECT USING (store_id = auth_store() OR user_id = auth.uid() OR auth_role() IN ('owner','district_manager'));
CREATE POLICY "goals_write" ON goals FOR ALL   USING (auth_role() IN ('owner','district_manager','manager'));

-- Rewards: all can read, owners manage
CREATE POLICY "rewards_read"  ON rewards FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "rewards_write" ON rewards FOR ALL   USING (auth_role() IN ('owner','district_manager'));

-- Redemptions: self
CREATE POLICY "redemptions_read"   ON redemptions FOR SELECT USING (user_id = auth.uid() OR auth_role() IN ('owner','district_manager'));
CREATE POLICY "redemptions_insert" ON redemptions FOR INSERT WITH CHECK (user_id = auth.uid());

-- Points ledger: self or owners
CREATE POLICY "pl_read"   ON points_ledger FOR SELECT USING (user_id = auth.uid() OR auth_role() IN ('owner','district_manager'));
CREATE POLICY "pl_insert" ON points_ledger FOR INSERT WITH CHECK (user_id = auth.uid() OR auth_role() IN ('owner','district_manager'));

-- Knowledge: all read, managers write
CREATE POLICY "kf_read"  ON knowledge_files FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "kf_write" ON knowledge_files FOR ALL   USING (auth_role() IN ('owner','district_manager','manager'));

-- EOD snapshots: all read, system writes
CREATE POLICY "eod_read" ON eod_snapshots FOR SELECT USING (auth.uid() IS NOT NULL);

-- ============================================================
-- Storage buckets (run via Supabase dashboard or API)
-- ============================================================
-- INSERT INTO storage.buckets (id, name, public) VALUES ('knowledge', 'knowledge', TRUE);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('attachments', 'attachments', FALSE);
