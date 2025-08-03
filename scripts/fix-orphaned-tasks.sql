-- Fix orphaned tasks before adding foreign key constraints
-- This script handles tasks that reference non-existent projects

-- 1. First, let's see what orphaned tasks exist
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

-- 3. Check if there are any valid projects to reassign tasks to
SELECT 
    id, 
    title, 
    status, 
    created_at
FROM projects 
ORDER BY created_at DESC 
LIMIT 5;

-- 4. Option A: Delete orphaned tasks (if you don't need them)
-- Uncomment the following lines if you want to delete orphaned tasks
/*
DELETE FROM tasks 
WHERE project_id IN (
    SELECT t.project_id
    FROM tasks t 
    LEFT JOIN projects p ON t.project_id = p.id 
    WHERE p.id IS NULL
);
*/

-- 5. Option B: Create a default project and reassign orphaned tasks
-- Uncomment and modify the following lines if you want to keep the tasks
/*
-- Create a default project for orphaned tasks
INSERT INTO projects (
    id,
    title, 
    description, 
    status, 
    created_by
) VALUES (
    '00000000-0000-0000-0000-000000000000', -- Use a specific UUID
    'Orphaned Tasks Project',
    'Default project for tasks that lost their original project',
    'archived',
    'your-user-id-here' -- Replace with actual user ID
);

-- Reassign orphaned tasks to the default project
UPDATE tasks 
SET project_id = '00000000-0000-0000-0000-000000000000'
WHERE project_id IN (
    SELECT t.project_id
    FROM tasks t 
    LEFT JOIN projects p ON t.project_id = p.id 
    WHERE p.id IS NULL
);
*/

-- 6. Option C: Set project_id to NULL for orphaned tasks (if your schema allows it)
-- Uncomment the following lines if your tasks table allows NULL project_id
/*
UPDATE tasks 
SET project_id = NULL
WHERE project_id IN (
    SELECT t.project_id
    FROM tasks t 
    LEFT JOIN projects p ON t.project_id = p.id 
    WHERE p.id IS NULL
);
*/

-- 7. Verify no orphaned tasks remain
SELECT COUNT(*) as remaining_orphaned_tasks
FROM tasks t 
LEFT JOIN projects p ON t.project_id = p.id 
WHERE p.id IS NULL;

-- 8. Now you can safely run the migration script
-- After running one of the options above, run the migration script again 