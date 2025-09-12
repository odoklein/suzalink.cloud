-- =====================================================
-- FIX PROSPECT_ASSIGNMENTS RELATIONSHIP
-- Run this SQL in your Supabase SQL Editor
-- =====================================================

-- First, let's check if the prospect_assignments table exists and its structure
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'prospect_assignments' 
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check existing foreign key constraints
SELECT 
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_name = 'prospect_assignments'
    AND tc.table_schema = 'public';

-- If the table doesn't exist or is missing relationships, recreate it
DROP TABLE IF EXISTS public.prospect_assignments CASCADE;

-- Recreate prospect_assignments table with proper relationships
CREATE TABLE IF NOT EXISTS public.prospect_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id UUID NOT NULL REFERENCES public.prospects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(prospect_id, user_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_prospect_assignments_prospect_id ON public.prospect_assignments(prospect_id);
CREATE INDEX IF NOT EXISTS idx_prospect_assignments_user_id ON public.prospect_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_prospect_assignments_assigned_by ON public.prospect_assignments(assigned_by);

-- Verify the table was created correctly
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'prospect_assignments' 
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- Verify foreign key constraints
SELECT 
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_name = 'prospect_assignments'
    AND tc.table_schema = 'public';
