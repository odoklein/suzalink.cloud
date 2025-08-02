-- Create client_status enum if it doesn't exist
DO $$ BEGIN
    CREATE TYPE client_status AS ENUM ('active', 'pending', 'inactive');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add missing columns to existing clients table
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS contact_email text,
ADD COLUMN IF NOT EXISTS company text,
ADD COLUMN IF NOT EXISTS status client_status DEFAULT 'active',
ADD COLUMN IF NOT EXISTS region text;

-- Make contact_email required for new records (but allow existing records to be null)
ALTER TABLE public.clients ALTER COLUMN contact_email SET NOT NULL;

-- Create unique index on contact_email if it doesn't exist
CREATE UNIQUE INDEX IF NOT EXISTS clients_contact_email_idx ON clients (contact_email);

-- Enable RLS if not already enabled
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow authenticated users to read clients" ON clients;
DROP POLICY IF EXISTS "Allow authenticated users to insert clients" ON clients;
DROP POLICY IF EXISTS "Allow authenticated users to update clients" ON clients;
DROP POLICY IF EXISTS "Allow authenticated users to delete clients" ON clients;

-- Create policies for clients (allow all authenticated users to read/write)
CREATE POLICY "Allow authenticated users to read clients" ON clients
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to insert clients" ON clients
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to update clients" ON clients
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to delete clients" ON clients
  FOR DELETE USING (auth.role() = 'authenticated'); 