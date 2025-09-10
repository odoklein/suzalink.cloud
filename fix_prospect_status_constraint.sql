-- =====================================================
-- FIX PROSPECT STATUS CONSTRAINT
-- This script updates the prospects table constraint to include
-- the missing status values used by the frontend
-- =====================================================

-- Drop the existing constraint
ALTER TABLE public.prospects 
DROP CONSTRAINT IF EXISTS prospects_status_check;

-- Add the updated constraint with all valid status values
ALTER TABLE public.prospects 
ADD CONSTRAINT prospects_status_check 
CHECK (status = ANY (ARRAY[
    'nouveau'::text, 
    'contacte'::text, 
    'interesse'::text, 
    'non_interesse'::text, 
    'rappel'::text, 
    'ferme'::text,
    'RDV'::text,
    'CLIENT'::text,
    'pas_interesse'::text
]));

-- Verify the constraint was added successfully
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conname = 'prospects_status_check' 
    AND conrelid = 'public.prospects'::regclass;
