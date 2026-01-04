-- WP-Designer Projects Table
-- Run this in Supabase SQL Editor to set up storage

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_email TEXT NOT NULL,
  name TEXT NOT NULL,
  data JSONB NOT NULL,           -- { project: Project, meta: ProjectMeta }
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for listing user's projects efficiently
CREATE INDEX IF NOT EXISTS idx_projects_owner ON projects(owner_email);

-- Index for sorting by last updated
CREATE INDEX IF NOT EXISTS idx_projects_updated ON projects(updated_at DESC);

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to auto-update updated_at on row update
DROP TRIGGER IF EXISTS update_projects_updated_at ON projects;
CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Optional: Enable Row Level Security
-- Uncomment if you want to use Supabase Auth later
-- ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Users can only access their own projects"
--   ON projects FOR ALL
--   USING (auth.jwt() ->> 'email' = owner_email);
