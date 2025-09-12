-- =====================================================
-- ADD INTERLOCUTEUR TO PROSPECT LISTS
-- Run this SQL in your Supabase SQL Editor
-- =====================================================

-- Add interlocuteur fields to prospect_lists table
ALTER TABLE public.prospect_lists 
ADD COLUMN IF NOT EXISTS default_interlocuteur_name text,
ADD COLUMN IF NOT EXISTS default_interlocuteur_email text,
ADD COLUMN IF NOT EXISTS default_interlocuteur_phone text,
ADD COLUMN IF NOT EXISTS default_interlocuteur_position text;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_prospect_lists_interlocuteur ON public.prospect_lists(default_interlocuteur_email);

-- Verify the changes
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'prospect_lists' 
    AND table_schema = 'public'
    AND column_name LIKE '%interlocuteur%'
ORDER BY column_name;
