-- =====================================================
-- FIX USERS ROLE CONSTRAINT
-- =====================================================

-- First, let's see what the current constraint looks like
SELECT conname, conrelid::regclass, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conname LIKE '%users_role%'
AND contype = 'c';

-- Drop the existing constraint that's causing issues
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;

-- Add a new, more permissive constraint that includes 'user' role
ALTER TABLE public.users
ADD CONSTRAINT users_role_check
CHECK (role IN ('admin', 'commercial', 'dev', 'user'));

-- Set default role to 'user' (which is now allowed)
ALTER TABLE public.users
ALTER COLUMN role SET DEFAULT 'user';

-- Update any null roles to 'user'
UPDATE public.users
SET role = 'user'
WHERE role IS NULL;

-- Now try the sync again
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

-- Verify the results
SELECT id, full_name, email, role, created_at
FROM public.users
ORDER BY created_at DESC
LIMIT 5;
