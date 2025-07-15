-- Migration: Create commandes table for Elementor form submissions
CREATE TABLE IF NOT EXISTS public.commandes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nom_et_prenom text NOT NULL,
  nom_de_lentreprise text,
  secteur_dactivite text,
  date_de_rendez_vous text,
  heure_du_rendez_vous text,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS (optional, for security)
ALTER TABLE public.commandes ENABLE ROW LEVEL SECURITY;

-- Policy: Allow authenticated users to read commandes
CREATE POLICY "Allow authenticated users to read commandes" ON public.commandes
  FOR SELECT USING (auth.role() = 'authenticated'); 