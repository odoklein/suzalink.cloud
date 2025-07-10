-- Migration to add user roles
-- Run this in your Supabase SQL editor

-- Create user roles enum
CREATE TYPE IF NOT EXISTS user_role AS ENUM ('admin', 'manager', 'user');

-- Add role column to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS role user_role NOT NULL DEFAULT 'user';

-- Update existing users to have appropriate roles
-- You can modify these based on your needs
UPDATE public.users 
SET role = 'admin' 
WHERE email IN (
  -- Add admin emails here
  'admin@example.com'
);

-- Update some users to manager role (optional)
UPDATE public.users 
SET role = 'manager' 
WHERE email IN (
  -- Add manager emails here
  'manager@example.com'
);

-- All other users will remain as 'user' role (default) 