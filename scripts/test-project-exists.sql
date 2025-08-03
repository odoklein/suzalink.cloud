-- Test script to check if the project exists and troubleshoot the foreign key constraint issue
-- Run this in your Supabase SQL Editor

-- 1. Check if the specific project exists
SELECT 
    id, 
    title, 
    status, 
    created_at,
    client_id
FROM projects 
WHERE id = 'a0ab8501-27b8-400e-bb7c-856bf177c9ef';

-- 2. If the project doesn't exist, check all projects
SELECT 
    id, 
    title, 
    status, 
    created_at
FROM projects 
ORDER BY created_at DESC 
LIMIT 10;

-- 3. Count total projects
SELECT COUNT(*) as total_projects FROM projects;

-- 4. Check if there are any tasks for this project
SELECT 
    id, 
    title, 
    status, 
    project_id,
    created_at
FROM tasks 
WHERE project_id = 'a0ab8501-27b8-400e-bb7c-856bf177c9ef';

-- 5. Check for orphaned tasks (tasks that reference non-existent projects)
SELECT 
    t.id, 
    t.title, 
    t.project_id,
    t.created_at
FROM tasks t 
LEFT JOIN projects p ON t.project_id = p.id 
WHERE p.id IS NULL;

-- 6. Check RLS policies on projects table
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'projects';

-- 7. Check RLS policies on tasks table
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'tasks';

-- 8. Test if you can insert a task manually (replace with a valid project ID)
-- Uncomment and modify the project_id below with a valid project ID from step 2
/*
INSERT INTO tasks (
    title, 
    description, 
    status, 
    priority,
    project_id,
    created_by
) VALUES (
    'Test Task',
    'This is a test task',
    'todo',
    'medium',
    'REPLACE_WITH_VALID_PROJECT_ID',
    'REPLACE_WITH_VALID_USER_ID'
) RETURNING id, title, project_id;
*/ 