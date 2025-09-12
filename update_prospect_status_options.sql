-- =====================================================
-- UPDATE PROSPECT STATUS OPTIONS
-- Run this SQL in your Supabase SQL Editor
-- =====================================================

-- Drop the existing constraint
ALTER TABLE public.prospects 
DROP CONSTRAINT IF EXISTS prospects_status_check;

-- Add the new constraint with updated status options
ALTER TABLE public.prospects 
ADD CONSTRAINT prospects_status_check 
CHECK (status IN ('NRP', 'Rappel', 'Relance', 'Mail', 'pas interessé', 'barrage', 'devis', 'rdv'));

-- Update existing prospects with 'nouveau' status to 'NRP' (Nouveau Prospect)
UPDATE public.prospects 
SET status = 'NRP' 
WHERE status = 'nouveau';

-- Update other old status values to closest new equivalents
UPDATE public.prospects 
SET status = 'Rappel' 
WHERE status = 'rappel';

UPDATE public.prospects 
SET status = 'pas interessé' 
WHERE status = 'non_interesse';

UPDATE public.prospects 
SET status = 'devis' 
WHERE status = 'ferme';

-- Set default status to NULL for new prospects
ALTER TABLE public.prospects 
ALTER COLUMN status SET DEFAULT NULL;

-- Verify the changes
SELECT 
    status,
    COUNT(*) as count
FROM public.prospects 
GROUP BY status
ORDER BY status;

-- Show the constraint details
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conname = 'prospects_status_check' 
AND conrelid = 'public.prospects'::regclass;
