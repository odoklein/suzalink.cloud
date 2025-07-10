-- Migration to add status and region fields to clients table
-- This migration handles the case where client_status enum might already exist

-- Create client_status enum if it doesn't exist
DO $$ BEGIN
    CREATE TYPE client_status AS ENUM ('active', 'pending', 'inactive');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add status and region columns to clients table if they don't exist
DO $$ BEGIN
    ALTER TABLE public.clients ADD COLUMN status client_status NOT NULL DEFAULT 'active';
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE public.clients ADD COLUMN region text;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- Update existing clients to have 'active' status if they don't have one
UPDATE public.clients SET status = 'active' WHERE status IS NULL; 