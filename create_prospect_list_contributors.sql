-- Create junction table for prospect list contributors
CREATE TABLE public.prospect_list_contributors (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  prospect_list_id uuid NOT NULL,
  user_id uuid NOT NULL,
  role text DEFAULT 'contributor',
  assigned_at timestamp with time zone DEFAULT now(),
  assigned_by uuid NOT NULL,

  CONSTRAINT prospect_list_contributors_pkey PRIMARY KEY (id),
  CONSTRAINT prospect_list_contributors_unique UNIQUE (prospect_list_id, user_id),
  CONSTRAINT prospect_list_contributors_list_fkey
    FOREIGN KEY (prospect_list_id) REFERENCES prospect_lists (id) ON DELETE CASCADE,
  CONSTRAINT prospect_list_contributors_user_fkey
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT prospect_list_contributors_assigner_fkey
    FOREIGN KEY (assigned_by) REFERENCES users (id)
);

-- Add indexes for performance
CREATE INDEX idx_prospect_list_contributors_list_id ON prospect_list_contributors(prospect_list_id);
CREATE INDEX idx_prospect_list_contributors_user_id ON prospect_list_contributors(user_id);

-- Enable RLS
ALTER TABLE prospect_list_contributors ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view contributors of lists they have access to" ON prospect_list_contributors
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM prospect_lists pl
      WHERE pl.id = prospect_list_contributors.prospect_list_id
      AND (pl.created_by = auth.uid() OR pl.user_id = auth.uid())
    ) OR
    EXISTS (
      SELECT 1 FROM prospect_list_contributors plc
      WHERE plc.prospect_list_id = prospect_list_contributors.prospect_list_id
      AND plc.user_id = auth.uid()
    )
  );

CREATE POLICY "List creators and owners can manage contributors" ON prospect_list_contributors
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM prospect_lists pl
      WHERE pl.id = prospect_list_contributors.prospect_list_id
      AND (pl.created_by = auth.uid() OR pl.user_id = auth.uid())
    )
  );
