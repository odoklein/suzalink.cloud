-- =====================================================
-- FIX USERS TABLE STRUCTURE
-- =====================================================

-- First, let's see what columns exist in the users table
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'users' AND table_schema = 'public'
ORDER BY ordinal_position;

-- Option 1: If the table has a 'name' column, rename it to 'full_name'
-- Uncomment this if your table has a 'name' column:
-- ALTER TABLE public.users RENAME COLUMN name TO full_name;

-- Option 2: If the table structure is wrong, drop and recreate
-- Uncomment these lines if you want to start fresh:
-- DROP TABLE IF EXISTS public.users CASCADE;
--
-- CREATE TABLE public.users (
--   id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
--   full_name text,
--   email text NOT NULL,
--   role text DEFAULT 'user' CHECK (role IN ('admin', 'commercial', 'dev')),
--   avatar_url text,
--   created_at timestamp with time zone DEFAULT now(),
--   updated_at timestamp with time zone DEFAULT now(),
--   CONSTRAINT users_pkey PRIMARY KEY (id),
--   CONSTRAINT users_email_key UNIQUE (email)
-- );

-- Option 3: Add the missing full_name column if it doesn't exist
-- This is the safest approach - just add the column if it's missing
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS full_name text;

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);

-- Now sync the data from auth.users to public.users
-- This will work regardless of whether full_name column was just added or already existed

-- Insert new users from auth.users
INSERT INTO public.users (id, full_name, email, created_at)
SELECT
  au.id,
  COALESCE(
    au.raw_user_meta_data->>'full_name',
    au.raw_user_meta_data->>'name',
    au.raw_user_meta_data->>'display_name',
    SPLIT_PART(au.email, '@', 1)
  ) as full_name,
  au.email,
  au.created_at
FROM auth.users au
WHERE NOT EXISTS (
  SELECT 1 FROM public.users pu WHERE pu.id = au.id
)
AND au.email IS NOT NULL
ON CONFLICT (id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  email = EXCLUDED.email,
  updated_at = now();

-- Update existing users with latest data
UPDATE public.users
SET
  full_name = COALESCE(
    au.raw_user_meta_data->>'full_name',
    au.raw_user_meta_data->>'name',
    au.raw_user_meta_data->>'display_name',
    SPLIT_PART(au.email, '@', 1)
  ),
  email = au.email,
  updated_at = now()
FROM auth.users au
WHERE public.users.id = au.id;

-- Set the first user as admin (optional)
UPDATE public.users
SET role = 'admin'
WHERE id = (
  SELECT id FROM public.users
  ORDER BY created_at ASC
  LIMIT 1
);

-- Verify the results
SELECT COUNT(*) as total_users FROM public.users;
SELECT id, full_name, email, role, created_at FROM public.users ORDER BY created_at DESC LIMIT 5;
