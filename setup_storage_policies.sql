-- =====================================================
-- SETUP STORAGE BUCKET POLICIES FOR ATTACHMENTS
-- =====================================================
-- Run this script on your production Supabase database
-- to ensure proper access to the attachments bucket

-- Create the attachements bucket (note the typo in the original code - this is the actual bucket name used)
INSERT INTO storage.buckets (id, name, public)
VALUES ('attachements', 'attachements', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "attachments_select_policy" ON storage.objects;
DROP POLICY IF EXISTS "attachments_insert_policy" ON storage.objects;
DROP POLICY IF EXISTS "attachments_update_policy" ON storage.objects;
DROP POLICY IF EXISTS "attachments_delete_policy" ON storage.objects;

-- Create permissive policies for attachements bucket (the actual bucket name used)
CREATE POLICY "Allow all operations on attachements"
ON storage.objects FOR ALL  
TO public
USING (bucket_id = 'attachements');

-- Ensure RLS is enabled on storage.objects but with permissive policies
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Grant necessary permissions
GRANT ALL ON storage.objects TO anon;
GRANT ALL ON storage.objects TO authenticated;
GRANT ALL ON storage.buckets TO anon;
GRANT ALL ON storage.buckets TO authenticated;

COMMIT;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================
-- Check bucket configuration
SELECT id, name, public FROM storage.buckets WHERE id = 'attachements';

-- Check storage policies
SELECT policyname, roles, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'storage' AND tablename = 'objects';
