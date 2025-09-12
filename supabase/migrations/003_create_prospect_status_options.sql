-- =====================================================
-- CREATE PROSPECT STATUS OPTIONS TABLE
-- This migration creates a table to manage dynamic status options
-- =====================================================

-- Create prospect_status_options table
CREATE TABLE IF NOT EXISTS public.prospect_status_options (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  color text NOT NULL DEFAULT '#6B7280', -- Default gray color
  description text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_by uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT prospect_status_options_pkey PRIMARY KEY (id),
  CONSTRAINT prospect_status_options_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE CASCADE,
  CONSTRAINT prospect_status_options_name_unique UNIQUE (name)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_prospect_status_options_active ON public.prospect_status_options(is_active);
CREATE INDEX IF NOT EXISTS idx_prospect_status_options_sort_order ON public.prospect_status_options(sort_order);

-- Insert default status options
INSERT INTO public.prospect_status_options (name, color, description, sort_order, created_by) VALUES
  ('NRP', '#6B7280', 'Nouveau Prospect', 1, (SELECT id FROM public.users WHERE role = 'admin' LIMIT 1)),
  ('Rappel', '#8B5CF6', 'À rappeler', 2, (SELECT id FROM public.users WHERE role = 'admin' LIMIT 1)),
  ('Relance', '#F59E0B', 'À relancer', 3, (SELECT id FROM public.users WHERE role = 'admin' LIMIT 1)),
  ('Mail', '#3B82F6', 'Email envoyé', 4, (SELECT id FROM public.users WHERE role = 'admin' LIMIT 1)),
  ('pas interessé', '#EF4444', 'Pas intéressé', 5, (SELECT id FROM public.users WHERE role = 'admin' LIMIT 1)),
  ('barrage', '#DC2626', 'Barrage', 6, (SELECT id FROM public.users WHERE role = 'admin' LIMIT 1)),
  ('devis', '#10B981', 'Devis demandé', 7, (SELECT id FROM public.users WHERE role = 'admin' LIMIT 1)),
  ('rdv', '#059669', 'Rendez-vous pris', 8, (SELECT id FROM public.users WHERE role = 'admin' LIMIT 1))
ON CONFLICT (name) DO NOTHING;

-- Update the prospects table constraint to be more flexible
-- First, drop the existing constraint
ALTER TABLE public.prospects 
DROP CONSTRAINT IF EXISTS prospects_status_check;

-- Add a new constraint that allows NULL and any status from the options table
-- We'll use a function to check if the status exists in the options table
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

-- Add the new constraint
ALTER TABLE public.prospects 
ADD CONSTRAINT prospects_status_check 
CHECK (check_prospect_status(status));

-- Create a trigger to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_prospect_status_options_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_prospect_status_options_updated_at
  BEFORE UPDATE ON public.prospect_status_options
  FOR EACH ROW
  EXECUTE FUNCTION update_prospect_status_options_updated_at();

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
  'Status options created' as status,
  COUNT(*) as count
FROM public.prospect_status_options;

SELECT 
  'Active status options' as status,
  COUNT(*) as count
FROM public.active_prospect_status_options;
