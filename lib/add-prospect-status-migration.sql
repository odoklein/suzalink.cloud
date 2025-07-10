-- Migration: Add prospect_status enum and update prospects table
DO $$ BEGIN
    CREATE TYPE prospect_status AS ENUM ('contacted', 'follow-up', 'closed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

ALTER TABLE public.prospects
  ALTER COLUMN status TYPE prospect_status USING status::prospect_status,
  ALTER COLUMN status SET DEFAULT 'contacted';

-- Set any NULL status to 'contacted'
UPDATE public.prospects SET status = 'contacted' WHERE status IS NULL; 