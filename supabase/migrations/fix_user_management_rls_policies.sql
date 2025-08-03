-- Fix RLS policies for user management
-- This migration adds proper admin permissions for user management

-- First, let's ensure the users table has RLS enabled
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to recreate them with proper admin support
DROP POLICY IF EXISTS "Users can view their own data" ON users;
DROP POLICY IF EXISTS "Users can update their own data" ON users;
DROP POLICY IF EXISTS "Users can insert their own data" ON users;

-- Policy for users to view their own data OR admin users to view all data
CREATE POLICY "Users can view their own data or admin can view all" ON users
  FOR SELECT USING (
    auth.uid() = id 
    OR 
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- Policy for users to update their own data OR admin users to update any data
CREATE POLICY "Users can update their own data or admin can update all" ON users
  FOR UPDATE USING (
    auth.uid() = id 
    OR 
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- Policy for users to insert their own data OR admin users to insert any data
CREATE POLICY "Users can insert their own data or admin can insert all" ON users
  FOR INSERT WITH CHECK (
    auth.uid() = id 
    OR 
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- Policy for admin users to delete any user (except themselves)
CREATE POLICY "Admin can delete users" ON users
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
    AND auth.uid() != id  -- Prevent self-deletion
  );

-- Add comments for documentation
COMMENT ON POLICY "Users can view their own data or admin can view all" ON users IS 'Allows users to view their own data and admins to view all user data';
COMMENT ON POLICY "Users can update their own data or admin can update all" ON users IS 'Allows users to update their own data and admins to update any user data';
COMMENT ON POLICY "Users can insert their own data or admin can insert all" ON users IS 'Allows users to insert their own data and admins to insert any user data';
COMMENT ON POLICY "Admin can delete users" ON users IS 'Allows admin users to delete any user except themselves'; 