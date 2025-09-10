-- Create prospect_interlocuteurs table
CREATE TABLE IF NOT EXISTS public.prospect_interlocuteurs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id UUID NOT NULL REFERENCES public.prospects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  position TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create prospect_activities table
CREATE TABLE IF NOT EXISTS public.prospect_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id UUID NOT NULL REFERENCES public.prospects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL CHECK (activity_type IN ('call', 'email', 'meeting', 'note', 'status_change', 'assignment')),
  description TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create prospect_assignments table
CREATE TABLE IF NOT EXISTS public.prospect_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id UUID NOT NULL REFERENCES public.prospects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(prospect_id, user_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_prospect_interlocuteurs_prospect_id ON public.prospect_interlocuteurs(prospect_id);
CREATE INDEX IF NOT EXISTS idx_prospect_activities_prospect_id ON public.prospect_activities(prospect_id);
CREATE INDEX IF NOT EXISTS idx_prospect_activities_user_id ON public.prospect_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_prospect_activities_created_at ON public.prospect_activities(created_at);
CREATE INDEX IF NOT EXISTS idx_prospect_assignments_prospect_id ON public.prospect_assignments(prospect_id);
CREATE INDEX IF NOT EXISTS idx_prospect_assignments_user_id ON public.prospect_assignments(user_id);

-- Add triggers for updated_at
CREATE OR REPLACE FUNCTION update_prospect_interlocuteurs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_prospect_interlocuteurs_updated_at
  BEFORE UPDATE ON public.prospect_interlocuteurs
  FOR EACH ROW
  EXECUTE FUNCTION update_prospect_interlocuteurs_updated_at();

-- Disable RLS for now (as requested)
-- ALTER TABLE public.prospect_interlocuteurs ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.prospect_activities ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.prospect_assignments ENABLE ROW LEVEL SECURITY;
