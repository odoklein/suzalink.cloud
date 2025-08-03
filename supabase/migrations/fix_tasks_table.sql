-- Fix tasks table by adding missing fields, constraints, and indexes
-- This migration addresses the foreign key constraint violation and missing fields

-- 1. Add missing fields to tasks table
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS priority text DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high'));

ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now();

-- 2. Add missing foreign key constraints
DO $$ 
BEGIN
    -- Add project_id foreign key constraint if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'tasks_project_id_fkey' 
        AND table_name = 'tasks'
    ) THEN
        ALTER TABLE tasks ADD CONSTRAINT tasks_project_id_fkey 
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
    END IF;
    
    -- Add created_by foreign key constraint if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'tasks_created_by_fkey' 
        AND table_name = 'tasks'
    ) THEN
        ALTER TABLE tasks ADD CONSTRAINT tasks_created_by_fkey 
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 3. Add missing indexes for performance
CREATE INDEX IF NOT EXISTS tasks_project_id_idx ON tasks(project_id);
CREATE INDEX IF NOT EXISTS tasks_status_idx ON tasks(status);
CREATE INDEX IF NOT EXISTS tasks_assignee_id_idx ON tasks(assignee_id);
CREATE INDEX IF NOT EXISTS tasks_created_by_idx ON tasks(created_by);
CREATE INDEX IF NOT EXISTS tasks_due_date_idx ON tasks(due_date);

-- 4. Enable RLS on tasks table
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- 5. Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow authenticated users to read tasks" ON tasks;
DROP POLICY IF EXISTS "Allow authenticated users to insert tasks" ON tasks;
DROP POLICY IF EXISTS "Allow authenticated users to update tasks" ON tasks;
DROP POLICY IF EXISTS "Allow authenticated users to delete tasks" ON tasks;

-- 6. Create RLS policies for tasks
CREATE POLICY "Allow authenticated users to read tasks" ON tasks
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to insert tasks" ON tasks
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to update tasks" ON tasks
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to delete tasks" ON tasks
  FOR DELETE USING (auth.role() = 'authenticated');

-- 7. Add comments for documentation
COMMENT ON TABLE tasks IS 'Stores task information for projects';
COMMENT ON COLUMN tasks.priority IS 'Task priority: low, medium, high';
COMMENT ON COLUMN tasks.status IS 'Task status: todo, doing, done';
COMMENT ON COLUMN tasks.progress IS 'Task completion percentage (0.0 to 1.0)';

-- 8. Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 9. Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_tasks_updated_at_trigger ON tasks;
CREATE TRIGGER update_tasks_updated_at_trigger
    BEFORE UPDATE ON tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_tasks_updated_at();

-- 10. Create a function to update project progress when tasks change
CREATE OR REPLACE FUNCTION update_project_progress()
RETURNS TRIGGER AS $$
BEGIN
    -- Update project progress when task status changes
    UPDATE projects 
    SET progress = (
        SELECT COALESCE(AVG(
            CASE 
                WHEN status = 'done' THEN 1.0
                WHEN status = 'doing' THEN 0.5
                ELSE 0.0
            END
        ), 0.0)
        FROM tasks 
        WHERE project_id = COALESCE(NEW.project_id, OLD.project_id)
    )
    WHERE id = COALESCE(NEW.project_id, OLD.project_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ language 'plpgsql';

-- 11. Create triggers to update project progress
DROP TRIGGER IF EXISTS update_project_progress_insert_trigger ON tasks;
DROP TRIGGER IF EXISTS update_project_progress_update_trigger ON tasks;
DROP TRIGGER IF EXISTS update_project_progress_delete_trigger ON tasks;

CREATE TRIGGER update_project_progress_insert_trigger
    AFTER INSERT ON tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_project_progress();

CREATE TRIGGER update_project_progress_update_trigger
    AFTER UPDATE ON tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_project_progress();

CREATE TRIGGER update_project_progress_delete_trigger
    AFTER DELETE ON tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_project_progress(); 