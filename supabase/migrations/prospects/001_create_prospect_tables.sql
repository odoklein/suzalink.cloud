-- Create prospect_lists table
CREATE TABLE IF NOT EXISTS public.prospect_lists (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  description text,
  client_id uuid,
  created_by uuid NOT NULL,
  status text NOT NULL DEFAULT 'active'::text CHECK (status = ANY (ARRAY['active'::text, 'inactive'::text, 'archived'::text])),
  prospect_count integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT prospect_lists_pkey PRIMARY KEY (id),
  CONSTRAINT prospect_lists_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id),
  CONSTRAINT prospect_lists_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id)
);

-- Create prospect_columns table
CREATE TABLE IF NOT EXISTS public.prospect_columns (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  list_id uuid NOT NULL,
  column_name text NOT NULL,
  column_type text NOT NULL CHECK (column_type = ANY (ARRAY['text'::text, 'email'::text, 'phone'::text, 'number'::text, 'date'::text, 'boolean'::text])),
  is_phone boolean DEFAULT false,
  display_order integer NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT prospect_columns_pkey PRIMARY KEY (id),
  CONSTRAINT prospect_columns_list_id_fkey FOREIGN KEY (list_id) REFERENCES public.prospect_lists(id) ON DELETE CASCADE
);

-- Create prospects table
CREATE TABLE IF NOT EXISTS public.prospects (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  list_id uuid NOT NULL,
  data jsonb NOT NULL,
  phone_number text,
  phone_column text,
  has_phone boolean DEFAULT false,
  created_by uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT prospects_pkey PRIMARY KEY (id),
  CONSTRAINT prospects_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id),
  CONSTRAINT prospects_list_id_fkey FOREIGN KEY (list_id) REFERENCES public.prospect_lists(id) ON DELETE CASCADE
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_prospects_list_id ON public.prospects(list_id);
CREATE INDEX IF NOT EXISTS idx_prospect_columns_list_id ON public.prospect_columns(list_id);
CREATE INDEX IF NOT EXISTS idx_prospects_has_phone ON public.prospects(has_phone);

-- Create function to increment prospect count
CREATE OR REPLACE FUNCTION public.increment_prospect_count(list_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.prospect_lists
  SET prospect_count = prospect_count + 1,
      updated_at = now()
  WHERE id = list_id;
END;
$$;

-- Create function to decrement prospect count
CREATE OR REPLACE FUNCTION public.decrement_prospect_count(list_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.prospect_lists
  SET prospect_count = GREATEST(prospect_count - 1, 0),
      updated_at = now()
  WHERE id = list_id;
END;
$$;

-- Create function to get prospect count
CREATE OR REPLACE FUNCTION public.get_prospect_count(list_id uuid)
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  count_val integer;
BEGIN
  SELECT COUNT(*) INTO count_val
  FROM public.prospects
  WHERE list_id = $1;
  
  RETURN count_val;
END;
$$;

-- Create trigger to update prospect_lists.updated_at when modified
CREATE OR REPLACE FUNCTION update_prospect_lists_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_prospect_lists_timestamp
BEFORE UPDATE ON public.prospect_lists
FOR EACH ROW
EXECUTE FUNCTION update_prospect_lists_updated_at();
