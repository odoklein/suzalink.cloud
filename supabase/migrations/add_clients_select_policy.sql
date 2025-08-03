-- Add policy to allow everyone to select clients
CREATE POLICY "Allow everyone to select clients" ON public.clients
FOR SELECT USING (true);

-- Enable RLS on clients table if not already enabled
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY; 