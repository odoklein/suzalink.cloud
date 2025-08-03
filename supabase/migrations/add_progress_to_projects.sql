-- Add progress column to projects table if it doesn't exist
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS progress decimal(3,2) DEFAULT 0.0 CHECK (progress >= 0.0 AND progress <= 1.0);

-- Add comment for the progress column
COMMENT ON COLUMN projects.progress IS 'Project completion percentage (0.0 to 1.0)'; 