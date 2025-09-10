-- =====================================================
-- ADD PROSPECT LIST ASSIGNMENT SYSTEM
-- =====================================================

-- Create table for assigning entire prospect lists to users
CREATE TABLE IF NOT EXISTS public.prospect_list_assignments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  list_id uuid NOT NULL,
  user_id uuid NOT NULL,
  assigned_by uuid NOT NULL,
  assigned_at timestamp with time zone DEFAULT now(),
  can_edit boolean DEFAULT true,
  can_delete boolean DEFAULT false,
  UNIQUE(list_id, user_id),
  CONSTRAINT prospect_list_assignments_pkey PRIMARY KEY (id),
  CONSTRAINT prospect_list_assignments_list_id_fkey FOREIGN KEY (list_id) REFERENCES public.prospect_lists(id) ON DELETE CASCADE,
  CONSTRAINT prospect_list_assignments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE,
  CONSTRAINT prospect_list_assignments_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES public.users(id) ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_prospect_list_assignments_list_id ON public.prospect_list_assignments(list_id);
CREATE INDEX IF NOT EXISTS idx_prospect_list_assignments_user_id ON public.prospect_list_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_prospect_list_assignments_assigned_by ON public.prospect_list_assignments(assigned_by);

-- Update prospect_lists table to include assignment info in queries
-- Add a function to get assigned users for a list
CREATE OR REPLACE FUNCTION get_list_assigned_users(list_uuid uuid)
RETURNS TABLE (
  user_id uuid,
  full_name text,
  email text,
  assigned_at timestamp with time zone,
  can_edit boolean,
  can_delete boolean
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    pla.user_id,
    u.full_name,
    u.email,
    pla.assigned_at,
    pla.can_edit,
    pla.can_delete
  FROM public.prospect_list_assignments pla
  JOIN public.users u ON pla.user_id = u.id
  WHERE pla.list_id = list_uuid
  ORDER BY pla.assigned_at DESC;
END;
$$;

-- Add a function to check if user has access to a list
CREATE OR REPLACE FUNCTION user_has_list_access(user_uuid uuid, list_uuid uuid)
RETURNS boolean
LANGUAGE plpgsql
AS $$
BEGIN
  -- Check if user is the creator of the list
  IF EXISTS (
    SELECT 1 FROM public.prospect_lists
    WHERE id = list_uuid AND created_by = user_uuid
  ) THEN
    RETURN true;
  END IF;

  -- Check if user is assigned to the list
  IF EXISTS (
    SELECT 1 FROM public.prospect_list_assignments
    WHERE list_id = list_uuid AND user_id = user_uuid
  ) THEN
    RETURN true;
  END IF;

  -- Check if user is admin
  IF EXISTS (
    SELECT 1 FROM public.users
    WHERE id = user_uuid AND role = 'admin'
  ) THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

-- Grant permissions (no RLS as requested)
GRANT ALL ON public.prospect_list_assignments TO authenticated;
GRANT EXECUTE ON FUNCTION get_list_assigned_users(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION user_has_list_access(uuid, uuid) TO authenticated;
