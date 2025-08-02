-- Add client_id to folders table
ALTER TABLE public.folders 
ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL;

-- Add client_id to lists table  
ALTER TABLE public.lists 
ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS folders_client_id_idx ON folders (client_id);
CREATE INDEX IF NOT EXISTS lists_client_id_idx ON lists (client_id);

-- Add comments for documentation
COMMENT ON COLUMN folders.client_id IS 'Reference to the client this folder is assigned to';
COMMENT ON COLUMN lists.client_id IS 'Reference to the client this list is assigned to'; 