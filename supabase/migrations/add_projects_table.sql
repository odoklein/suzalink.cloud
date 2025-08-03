-- Create project_status enum if it doesn't exist
DO $$ BEGIN
    CREATE TYPE project_status AS ENUM ('active', 'completed', 'on_hold', 'cancelled', 'archived');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create projects table
CREATE TABLE IF NOT EXISTS public.projects (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  status project_status NOT NULL DEFAULT 'active',
  client_id uuid REFERENCES clients(id) ON DELETE SET NULL,
  start_date date,
  end_date date,
  budget decimal(10,2),
  progress decimal(3,2) DEFAULT 0.0 CHECK (progress >= 0.0 AND progress <= 1.0),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT projects_pkey PRIMARY KEY (id)
);

-- Enable RLS
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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS projects_status_idx ON projects (status);
CREATE INDEX IF NOT EXISTS projects_client_id_idx ON projects (client_id);
CREATE INDEX IF NOT EXISTS projects_created_at_idx ON projects (created_at);

-- Add comments for documentation
COMMENT ON TABLE projects IS 'Stores project information for the application';
COMMENT ON COLUMN projects.progress IS 'Project completion percentage (0.0 to 1.0)'; 