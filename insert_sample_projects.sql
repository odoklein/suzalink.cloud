-- Insert sample projects into the database
-- Run this in your Supabase SQL Editor after running the fix_projects_table.sql

-- First, let's check if we have any clients to reference
-- If no clients exist, we'll create some sample clients first
INSERT INTO clients (name, contact_email, company, status, region) 
VALUES 
  ('Acme Corporation', 'contact@acme.com', 'Acme Corp', 'active', 'Paris'),
  ('TechStart Inc', 'hello@techstart.com', 'TechStart', 'active', 'Lyon'),
  ('Global Solutions', 'info@globalsolutions.com', 'Global Solutions Ltd', 'active', 'Marseille')
ON CONFLICT (contact_email) DO NOTHING;

-- Now insert sample projects
INSERT INTO projects (title, description, status, client_id, start_date, end_date, budget, progress) 
VALUES 
  (
    'Site Web E-commerce', 
    'Développement d\'une plateforme e-commerce complète avec système de paiement et gestion des stocks', 
    'active', 
    (SELECT id FROM clients WHERE name = 'Acme Corporation' LIMIT 1), 
    '2024-01-15', 
    '2024-06-30', 
    25000.00, 
    0.75
  ),
  (
    'Application Mobile', 
    'Création d\'une application mobile iOS et Android pour la gestion de tâches', 
    'active', 
    (SELECT id FROM clients WHERE name = 'TechStart Inc' LIMIT 1), 
    '2024-02-01', 
    '2024-08-15', 
    18000.00, 
    0.45
  ),
  (
    'Système de CRM', 
    'Développement d\'un système de gestion de la relation client personnalisé', 
    'completed', 
    (SELECT id FROM clients WHERE name = 'Global Solutions' LIMIT 1), 
    '2023-09-01', 
    '2024-01-31', 
    32000.00, 
    1.00
  ),
  (
    'Refonte Interface', 
    'Modernisation de l\'interface utilisateur d\'une application existante', 
    'on_hold', 
    (SELECT id FROM clients WHERE name = 'Acme Corporation' LIMIT 1), 
    '2024-03-01', 
    '2024-07-31', 
    12000.00, 
    0.20
  ),
  (
    'API REST', 
    'Développement d\'une API REST pour l\'intégration de services tiers', 
    'active', 
    (SELECT id FROM clients WHERE name = 'TechStart Inc' LIMIT 1), 
    '2024-01-01', 
    '2024-04-30', 
    8000.00, 
    0.90
  ),
  (
    'Migration Base de Données', 
    'Migration d\'une base de données legacy vers une solution moderne', 
    'archived', 
    (SELECT id FROM clients WHERE name = 'Global Solutions' LIMIT 1), 
    '2023-06-01', 
    '2023-12-31', 
    15000.00, 
    1.00
  );

-- Verify the projects were created
SELECT 
  p.title,
  p.status,
  p.progress,
  c.name as client_name,
  p.budget,
  p.start_date
FROM projects p
LEFT JOIN clients c ON p.client_id = c.id
ORDER BY p.created_at DESC; 