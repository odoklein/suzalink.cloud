-- Add assigned_to column to prospects table
ALTER TABLE public.prospects 
ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Add index for better performance on assigned_to queries
CREATE INDEX IF NOT EXISTS idx_prospects_assigned_to ON public.prospects(assigned_to);

-- Add index for filtering prospects by assigned user
CREATE INDEX IF NOT EXISTS idx_prospects_list_assigned ON public.prospects(list_id, assigned_to);
