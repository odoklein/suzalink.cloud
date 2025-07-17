-- Migration: Add 'opened' column to commandes table
ALTER TABLE public.commandes ADD COLUMN IF NOT EXISTS opened boolean DEFAULT false; 