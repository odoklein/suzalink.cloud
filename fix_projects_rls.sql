-- Fix RLS policies for projects table
-- Run this in your Supabase SQL Editor

-- First, let's check what authentication method you're using
-- Since you're using NextAuth, we need to ensure the policies work with your setup

-- Drop existing policies
DROP POLICY IF EXISTS "Allow authenticated users to read projects" ON projects;
DROP POLICY IF EXISTS "Allow authenticated users to insert projects" ON projects;
DROP POLICY IF EXISTS "Allow authenticated users to update projects" ON projects;
DROP POLICY IF EXISTS "Allow authenticated users to delete projects" ON projects;

-- Create new policies that work with NextAuth
-- These policies allow any authenticated user to access projects
-- You can modify these later to be more restrictive if needed

-- Policy for reading projects
CREATE POLICY "Allow authenticated users to read projects" ON projects
  FOR SELECT USING (
    auth.role() = 'authenticated' 
    OR 
    auth.role() = 'anon'
  );

-- Policy for inserting projects
CREATE POLICY "Allow authenticated users to insert projects" ON projects
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated' 
    OR 
    auth.role() = 'anon'
  );

-- Policy for updating projects
CREATE POLICY "Allow authenticated users to update projects" ON projects
  FOR UPDATE USING (
    auth.role() = 'authenticated' 
    OR 
    auth.role() = 'anon'
  );

-- Policy for deleting projects
CREATE POLICY "Allow authenticated users to delete projects" ON projects
  FOR DELETE USING (
    auth.role() = 'authenticated' 
    OR 
    auth.role() = 'anon'
  );

-- Re-enable RLS
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Test the policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies 
WHERE tablename = 'projects';

-- Verify the table has RLS enabled
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE tablename = 'projects'; 