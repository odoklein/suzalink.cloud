-- =====================================================
-- ADD DEFAULT INTERLOCUTEUR COLUMNS TO PROSPECT_LISTS
-- This migration adds the missing default interlocuteur columns
-- =====================================================

-- Add default interlocuteur columns to prospect_lists table
ALTER TABLE public.prospect_lists 
ADD COLUMN IF NOT EXISTS default_interlocuteur_name text,
ADD COLUMN IF NOT EXISTS default_interlocuteur_email text,
ADD COLUMN IF NOT EXISTS default_interlocuteur_phone text,
ADD COLUMN IF NOT EXISTS default_interlocuteur_position text;

-- Add comments to document the columns
COMMENT ON COLUMN public.prospect_lists.default_interlocuteur_name IS 'Default interlocuteur name for new prospects in this list';
COMMENT ON COLUMN public.prospect_lists.default_interlocuteur_email IS 'Default interlocuteur email for new prospects in this list';
COMMENT ON COLUMN public.prospect_lists.default_interlocuteur_phone IS 'Default interlocuteur phone for new prospects in this list';
COMMENT ON COLUMN public.prospect_lists.default_interlocuteur_position IS 'Default interlocuteur position for new prospects in this list';

-- Verify the columns were added
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM information_schema.columns 
WHERE table_name = 'prospect_lists' 
  AND table_schema = 'public'
  AND column_name LIKE 'default_interlocuteur_%'
ORDER BY column_name;
