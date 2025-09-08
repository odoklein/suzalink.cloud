-- Add system columns to prospects table
ALTER TABLE public.prospects 
ADD COLUMN IF NOT EXISTS status text DEFAULT 'nouveau' CHECK (status IN ('nouveau', 'contacte', 'interesse', 'non_interesse', 'rappel', 'ferme')),
ADD COLUMN IF NOT EXISTS commentaire text,
ADD COLUMN IF NOT EXISTS rappel_date timestamp with time zone;

-- Create index for rappel_date for better performance on reminder queries
CREATE INDEX IF NOT EXISTS idx_prospects_rappel_date ON public.prospects(rappel_date);

-- Create index for status for filtering
CREATE INDEX IF NOT EXISTS idx_prospects_status ON public.prospects(status);

-- Update existing prospects to have default status
UPDATE public.prospects 
SET status = 'nouveau' 
WHERE status IS NULL;

