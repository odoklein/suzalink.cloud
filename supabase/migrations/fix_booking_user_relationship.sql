-- Fix booking user relationship
-- This migration ensures that the bookings table can properly join with the users table

-- First, let's make sure the users table exists and has the right structure
CREATE TABLE IF NOT EXISTS public.users (
  id uuid NOT NULL,
  email text,
  full_name text,
  role text NOT NULL DEFAULT 'user',
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT users_pkey PRIMARY KEY (id),
  CONSTRAINT users_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);

-- Drop the existing foreign key constraint that references auth.users
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'bookings_host_user_id_fkey' 
    AND table_name = 'bookings'
  ) THEN
    ALTER TABLE bookings DROP CONSTRAINT bookings_host_user_id_fkey;
  END IF;
END $$;

-- Add the new foreign key constraint to reference public.users instead of auth.users
ALTER TABLE bookings 
ADD CONSTRAINT bookings_host_user_id_fkey 
FOREIGN KEY (host_user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- Create an index for better performance
CREATE INDEX IF NOT EXISTS idx_bookings_host_user_id ON bookings(host_user_id);

-- Ensure RLS policies are in place
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view their own data" ON users;
DROP POLICY IF EXISTS "Users can update their own data" ON users;
DROP POLICY IF EXISTS "Users can insert their own data" ON users;

-- Policy for users to view their own data
CREATE POLICY "Users can view their own data" ON users
  FOR SELECT USING (auth.uid() = id);

-- Policy for users to update their own data
CREATE POLICY "Users can update their own data" ON users
  FOR UPDATE USING (auth.uid() = id);

-- Policy for users to insert their own data
CREATE POLICY "Users can insert their own data" ON users
  FOR INSERT WITH CHECK (auth.uid() = id); 