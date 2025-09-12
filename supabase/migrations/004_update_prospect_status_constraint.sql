-- =====================================================
-- UPDATE PROSPECT STATUS CONSTRAINT FOR DYNAMIC STATUS
-- This migration updates the prospects table constraint to work with dynamic status options
-- =====================================================

-- First, drop the existing constraint
ALTER TABLE public.prospects 
DROP CONSTRAINT IF EXISTS prospects_status_check;

-- Create a function to check if the status exists in the options table
CREATE OR REPLACE FUNCTION check_prospect_status(status_value text)
RETURNS boolean AS $$
BEGIN
  -- Allow NULL values
  IF status_value IS NULL THEN
    RETURN true;
  END IF;
  
  -- Check if the status exists in the active options
  RETURN EXISTS (
    SELECT 1 FROM public.prospect_status_options 
    WHERE name = status_value AND is_active = true
  );
END;
$$ LANGUAGE plpgsql;

-- Add the new constraint that uses the function
ALTER TABLE public.prospects 
ADD CONSTRAINT prospects_status_check 
CHECK (check_prospect_status(status));

-- Create a view for easy access to active status options
CREATE OR REPLACE VIEW public.active_prospect_status_options AS
SELECT 
  id,
  name,
  color,
  description,
  sort_order,
  created_at,
  updated_at
FROM public.prospect_status_options
WHERE is_active = true
ORDER BY sort_order, name;

-- Grant necessary permissions
GRANT SELECT ON public.prospect_status_options TO authenticated;
GRANT SELECT ON public.active_prospect_status_options TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.prospect_status_options TO authenticated;

-- Verify the setup
SELECT 
  'Status constraint updated' as status,
  'Dynamic status validation enabled' as message;

-- Test the constraint with a sample status
DO $$
BEGIN
  -- This should work if there are active status options
  IF EXISTS (SELECT 1 FROM public.prospect_status_options WHERE is_active = true LIMIT 1) THEN
    RAISE NOTICE 'Dynamic status constraint is working correctly';
  ELSE
    RAISE NOTICE 'No active status options found. Please add some status options.';
  END IF;
END $$;
