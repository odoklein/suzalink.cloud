-- =====================================================
-- RECREATE USERS TABLE AND SYNC DATA
-- =====================================================

-- Create the users table with the correct structure
CREATE TABLE IF NOT EXISTS public.users (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  full_name text,
  email text NOT NULL,
  role text DEFAULT 'user' CHECK (role IN ('admin', 'commercial', 'dev')),
  avatar_url text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT users_pkey PRIMARY KEY (id),
  CONSTRAINT users_email_key UNIQUE (email)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- SYNC DATA FROM AUTH.USERS TO PUBLIC.USERS
-- =====================================================

-- Insert users from auth.users into public.users
-- This will sync all existing auth users to your public users table
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
AND au.email IS NOT NULL;

-- Update existing users with latest data from auth.users
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

-- =====================================================
-- SET ADMIN ROLE FOR FIRST USER (OPTIONAL)
-- =====================================================

-- If you want to set the first user as admin, uncomment this:
-- UPDATE public.users
-- SET role = 'admin'
-- WHERE id = (
--   SELECT id FROM public.users
--   ORDER BY created_at ASC
--   LIMIT 1
-- );

-- =====================================================
-- VERIFY THE SYNC
-- =====================================================

-- Check how many users were synced
SELECT COUNT(*) as users_count FROM public.users;

-- Show the users data
SELECT id, full_name, email, role, created_at FROM public.users ORDER BY created_at DESC;
