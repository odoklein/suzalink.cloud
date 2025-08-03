-- Test script to check projects table and data
-- Run this in your Supabase SQL Editor

-- 1. Check if projects table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'projects'
) as table_exists;

-- 2. Check table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'projects'
ORDER BY ordinal_position;

-- 3. Count total projects
SELECT COUNT(*) as total_projects FROM projects;

-- 4. Show all projects (first 10)
SELECT 
  id,
  title,
  status,
  progress,
  created_at,
  client_id
FROM projects 
ORDER BY created_at DESC 
LIMIT 10;

-- 5. Check RLS policies
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

-- 6. Test a simple query as authenticated user
-- This simulates what the app would do
SELECT 
  id, 
  title, 
  description, 
  status, 
  start_date, 
  end_date, 
  budget, 
  progress, 
  created_at,
  client_id
FROM projects 
ORDER BY created_at DESC 
LIMIT 5; 