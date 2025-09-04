-- =====================================================
-- DISABLE RLS POLICIES FOR LIST OPERATIONS
-- =====================================================
-- Run this script on your production Supabase database
-- to disable Row Level Security for lists and related tables

-- Disable RLS on lists table
ALTER TABLE IF EXISTS public.lists DISABLE ROW LEVEL SECURITY;

-- Disable RLS on list_items table  
ALTER TABLE IF EXISTS public.list_items DISABLE ROW LEVEL SECURITY;

-- Disable RLS on folders table (related to lists)
ALTER TABLE IF EXISTS public.folders DISABLE ROW LEVEL SECURITY;

-- Drop any existing policies on lists table
DROP POLICY IF EXISTS "lists_policy" ON public.lists;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.lists;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.lists;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.lists;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.lists;

-- Drop any existing policies on list_items table
DROP POLICY IF EXISTS "list_items_policy" ON public.list_items;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.list_items;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.list_items;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.list_items;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.list_items;

-- Drop any existing policies on folders table
DROP POLICY IF EXISTS "folders_policy" ON public.folders;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.folders;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.folders;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.folders;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.folders;

-- Grant public access to lists table
GRANT ALL ON public.lists TO anon;
GRANT ALL ON public.lists TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Grant public access to list_items table
GRANT ALL ON public.list_items TO anon;
GRANT ALL ON public.list_items TO authenticated;

-- Grant public access to folders table
GRANT ALL ON public.folders TO anon;
GRANT ALL ON public.folders TO authenticated;

-- Also disable RLS on storage objects for attachments bucket
ALTER TABLE IF EXISTS storage.objects DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "attachments_policy" ON storage.objects;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON storage.objects;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON storage.objects;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON storage.objects;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON storage.objects;

-- Grant access to storage objects
GRANT ALL ON storage.objects TO anon;
GRANT ALL ON storage.objects TO authenticated;

COMMIT;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================
-- Run these to verify RLS is disabled:

-- Check RLS status
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('lists', 'list_items', 'folders') 
  AND schemaname = 'public';

-- Check existing policies
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE tablename IN ('lists', 'list_items', 'folders');
