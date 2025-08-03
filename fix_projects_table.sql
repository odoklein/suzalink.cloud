-- Fix projects table by adding missing columns
-- Run this in your Supabase SQL Editor

-- Add progress column if it doesn't exist
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS progress decimal(3,2) DEFAULT 0.0 CHECK (progress >= 0.0 AND progress <= 1.0);

-- Add updated_at column if it doesn't exist
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now();

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS projects_status_idx ON projects (status);
CREATE INDEX IF NOT EXISTS projects_client_id_idx ON projects (client_id);
CREATE INDEX IF NOT EXISTS projects_created_at_idx ON projects (created_at);

-- Enable RLS if not already enabled
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow authenticated users to read projects" ON projects;
DROP POLICY IF EXISTS "Allow authenticated users to insert projects" ON projects;
DROP POLICY IF EXISTS "Allow authenticated users to update projects" ON projects;
DROP POLICY IF EXISTS "Allow authenticated users to delete projects" ON projects;

-- Create policies for projects (allow all authenticated users to read/write)
CREATE POLICY "Allow authenticated users to read projects" ON projects
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to insert projects" ON projects
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to update projects" ON projects
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to delete projects" ON projects
  FOR DELETE USING (auth.role() = 'authenticated');

-- Add comments for documentation
COMMENT ON COLUMN projects.progress IS 'Project completion percentage (0.0 to 1.0)'; 