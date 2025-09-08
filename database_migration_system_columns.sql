-- =====================================================
-- PROSPECT SYSTEM COLUMNS MIGRATION
-- Run this SQL in your Supabase SQL Editor
-- =====================================================

-- Add system columns to prospects table
ALTER TABLE public.prospects 
ADD COLUMN IF NOT EXISTS status text DEFAULT 'nouveau' CHECK (status IN ('nouveau', 'contacte', 'interesse', 'non_interesse', 'rappel', 'ferme')),
ADD COLUMN IF NOT EXISTS commentaire text,
ADD COLUMN IF NOT EXISTS rappel_date timestamp with time zone;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_prospects_rappel_date ON public.prospects(rappel_date);
CREATE INDEX IF NOT EXISTS idx_prospects_status ON public.prospects(status);

-- Update existing prospects to have default status
UPDATE public.prospects 
SET status = 'nouveau' 
WHERE status IS NULL;

-- Add unique constraint for prospect_columns if it doesn't exist
-- This prevents duplicate column names for the same list
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'prospect_columns_list_id_column_name_key'
        AND table_name = 'prospect_columns'
    ) THEN
        ALTER TABLE public.prospect_columns 
        ADD CONSTRAINT prospect_columns_list_id_column_name_key 
        UNIQUE (list_id, column_name);
    END IF;
END $$;

-- Verify the changes
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'prospects' 
    AND table_schema = 'public'
    AND column_name IN ('status', 'commentaire', 'rappel_date')
ORDER BY column_name;
