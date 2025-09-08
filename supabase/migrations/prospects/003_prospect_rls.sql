-- Enable Row Level Security
ALTER TABLE public.prospect_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prospect_columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prospects ENABLE ROW LEVEL SECURITY;

-- Create policies for prospect_lists
CREATE POLICY "Allow users to read all prospect lists" 
ON public.prospect_lists FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Allow users to create prospect lists" 
ON public.prospect_lists FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow users to update their own prospect lists" 
ON public.prospect_lists FOR UPDATE 
USING (auth.uid() = created_by OR auth.role() = 'admin');

CREATE POLICY "Allow users to delete their own prospect lists" 
ON public.prospect_lists FOR DELETE 
USING (auth.uid() = created_by OR auth.role() = 'admin');

-- Create policies for prospect_columns
CREATE POLICY "Allow users to read all prospect columns" 
ON public.prospect_columns FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Allow users to create prospect columns" 
ON public.prospect_columns FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow users to update prospect columns" 
ON public.prospect_columns FOR UPDATE 
USING (auth.role() = 'authenticated');

CREATE POLICY "Allow users to delete prospect columns" 
ON public.prospect_columns FOR DELETE 
USING (auth.role() = 'authenticated');

-- Create policies for prospects
CREATE POLICY "Allow users to read all prospects" 
ON public.prospects FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Allow users to create prospects" 
ON public.prospects FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow users to update prospects" 
ON public.prospects FOR UPDATE 
USING (auth.role() = 'authenticated');

CREATE POLICY "Allow users to delete prospects" 
ON public.prospects FOR DELETE 
USING (auth.uid() = created_by OR auth.role() = 'admin');
