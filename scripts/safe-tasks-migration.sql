-- Safe migration script that handles orphaned tasks before adding constraints
-- Run this script in your Supabase SQL Editor

-- 1. First, let's see what orphaned tasks exist
SELECT 'Checking for orphaned tasks...' as status;

SELECT 
    t.id, 
    t.title, 
    t.project_id,
    t.created_at
FROM tasks t 
LEFT JOIN projects p ON t.project_id = p.id 
WHERE p.id IS NULL;

-- 2. Count orphaned tasks
SELECT COUNT(*) as orphaned_tasks_count
FROM tasks t 
LEFT JOIN projects p ON t.project_id = p.id 
WHERE p.id IS NULL;

-- 3. Add missing fields to tasks table (this should work regardless of orphaned tasks)
SELECT 'Adding missing fields to tasks table...' as status;

ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS priority text DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high'));

ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now();

-- 4. Add missing indexes for performance (this should work regardless of orphaned tasks)
SELECT 'Adding performance indexes...' as status;

CREATE INDEX IF NOT EXISTS tasks_project_id_idx ON tasks(project_id);
CREATE INDEX IF NOT EXISTS tasks_status_idx ON tasks(status);
CREATE INDEX IF NOT EXISTS tasks_assignee_id_idx ON tasks(assignee_id);
CREATE INDEX IF NOT EXISTS tasks_created_by_idx ON tasks(created_by);
CREATE INDEX IF NOT EXISTS tasks_due_date_idx ON tasks(due_date);

-- 5. Enable RLS on tasks table
SELECT 'Enabling RLS...' as status;

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- 6. Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow authenticated users to read tasks" ON tasks;
DROP POLICY IF EXISTS "Allow authenticated users to insert tasks" ON tasks;
DROP POLICY IF EXISTS "Allow authenticated users to update tasks" ON tasks;
DROP POLICY IF EXISTS "Allow authenticated users to delete tasks" ON tasks;

-- 7. Create RLS policies for tasks
CREATE POLICY "Allow authenticated users to read tasks" ON tasks
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to insert tasks" ON tasks
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to update tasks" ON tasks
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to delete tasks" ON tasks
  FOR DELETE USING (auth.role() = 'authenticated');

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

-- 12. Now handle orphaned tasks - DELETE THEM (safest option)
SELECT 'Cleaning up orphaned tasks...' as status;

DELETE FROM tasks 
WHERE project_id IN (
    SELECT t.project_id
    FROM tasks t 
    LEFT JOIN projects p ON t.project_id = p.id 
    WHERE p.id IS NULL
);

-- 13. Now add foreign key constraints (should work now)
SELECT 'Adding foreign key constraints...' as status;

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

-- 14. Verify the changes
SELECT 'Verifying changes...' as status;

SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'tasks' 
ORDER BY ordinal_position;

-- 15. Check constraints
SELECT 
    constraint_name, 
    constraint_type 
FROM information_schema.table_constraints 
WHERE table_name = 'tasks';

-- 16. Check indexes
SELECT 
    indexname, 
    indexdef 
FROM pg_indexes 
WHERE tablename = 'tasks';

-- 17. Final verification - no orphaned tasks should remain
SELECT COUNT(*) as remaining_orphaned_tasks
FROM tasks t 
LEFT JOIN projects p ON t.project_id = p.id 
WHERE p.id IS NULL;

SELECT 'Migration completed successfully!' as status; 