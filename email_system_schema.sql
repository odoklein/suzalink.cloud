-- =====================================================
-- EMAIL SYSTEM DATABASE SCHEMA
-- Complete schema for personal email management and campaigns
-- =====================================================

-- =====================================================
-- PERSONAL EMAIL MANAGEMENT TABLES
-- =====================================================

-- User email configurations (IMAP/SMTP settings)
CREATE TABLE IF NOT EXISTS public.user_email_configs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  email_address text NOT NULL,
  display_name text,
  -- IMAP Settings
  imap_host text NOT NULL,
  imap_port integer DEFAULT 993,
  imap_secure boolean DEFAULT true,
  imap_username text NOT NULL,
  imap_password_encrypted text NOT NULL,
  -- SMTP Settings
  smtp_host text NOT NULL,
  smtp_port integer DEFAULT 587,
  smtp_secure boolean DEFAULT false,
  smtp_username text NOT NULL,
  smtp_password_encrypted text NOT NULL,
  -- Status and Settings
  is_active boolean DEFAULT true,
  last_sync_at timestamp with time zone,
  sync_frequency_minutes integer DEFAULT 15,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_email_configs_pkey PRIMARY KEY (id),
  CONSTRAINT user_email_configs_user_id_email_address_key UNIQUE (user_id, email_address),
  CONSTRAINT user_email_configs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
);

-- Email folders for personal organization
CREATE TABLE IF NOT EXISTS public.email_folders (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  email_config_id uuid NOT NULL,
  folder_name text NOT NULL,
  folder_path text NOT NULL,
  folder_type text CHECK (folder_type IN ('inbox', 'sent', 'drafts', 'trash', 'spam', 'archive', 'custom')),
  message_count integer DEFAULT 0,
  unread_count integer DEFAULT 0,
  is_system boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT email_folders_pkey PRIMARY KEY (id),
  CONSTRAINT email_folders_user_id_folder_path_key UNIQUE (user_id, email_config_id, folder_path),
  CONSTRAINT email_folders_email_config_id_fkey FOREIGN KEY (email_config_id) REFERENCES public.user_email_configs(id) ON DELETE CASCADE,
  CONSTRAINT email_folders_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
);

-- Personal emails storage
CREATE TABLE IF NOT EXISTS public.personal_emails (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  email_config_id uuid NOT NULL,
  folder_id uuid NOT NULL,
  -- Email metadata
  message_id text NOT NULL,
  thread_id text,
  subject text,
  sender_name text,
  sender_email text NOT NULL,
  recipient_emails text[] NOT NULL,
  cc_emails text[],
  bcc_emails text[],
  -- Email content
  email_text text,
  email_html text,
  -- Status and flags
  is_read boolean DEFAULT false,
  is_starred boolean DEFAULT false,
  is_deleted boolean DEFAULT false,
  has_attachments boolean DEFAULT false,
  -- Dates
  sent_at timestamp with time zone NOT NULL,
  received_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT personal_emails_pkey PRIMARY KEY (id),
  CONSTRAINT personal_emails_message_id_email_config_id_key UNIQUE (message_id, email_config_id),
  CONSTRAINT personal_emails_email_config_id_fkey FOREIGN KEY (email_config_id) REFERENCES public.user_email_configs(id) ON DELETE CASCADE,
  CONSTRAINT personal_emails_folder_id_fkey FOREIGN KEY (folder_id) REFERENCES public.email_folders(id) ON DELETE CASCADE,
  CONSTRAINT personal_emails_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
);

-- Email attachments
CREATE TABLE IF NOT EXISTS public.email_attachments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  email_id uuid NOT NULL,
  filename text NOT NULL,
  content_type text NOT NULL,
  size_bytes integer NOT NULL,
  storage_path text NOT NULL,
  attachment_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT email_attachments_pkey PRIMARY KEY (id),
  CONSTRAINT email_attachments_email_id_fkey FOREIGN KEY (email_id) REFERENCES public.personal_emails(id) ON DELETE CASCADE
);

-- Email labels/tags
CREATE TABLE IF NOT EXISTS public.email_labels (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  label_name text NOT NULL,
  label_color text DEFAULT '#3B82F6',
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT email_labels_pkey PRIMARY KEY (id),
  CONSTRAINT email_labels_user_id_label_name_key UNIQUE (user_id, label_name),
  CONSTRAINT email_labels_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
);

-- Email to label relationship
CREATE TABLE IF NOT EXISTS public.email_label_assignments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  email_id uuid NOT NULL,
  label_id uuid NOT NULL,
  assigned_at timestamp with time zone DEFAULT now(),
  CONSTRAINT email_label_assignments_pkey PRIMARY KEY (id),
  CONSTRAINT email_label_assignments_email_id_label_id_key UNIQUE (email_id, label_id),
  CONSTRAINT email_label_assignments_email_id_fkey FOREIGN KEY (email_id) REFERENCES public.personal_emails(id) ON DELETE CASCADE,
  CONSTRAINT email_label_assignments_label_id_fkey FOREIGN KEY (label_id) REFERENCES public.email_labels(id) ON DELETE CASCADE
);

-- =====================================================
-- EMAIL CAMPAIGN SYSTEM TABLES
-- =====================================================

-- Email templates
CREATE TABLE IF NOT EXISTS public.email_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  subject text NOT NULL,
  content text NOT NULL,
  html_content text,
  text_content text,
  variables jsonb DEFAULT '{}',
  category text DEFAULT 'general',
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT email_templates_pkey PRIMARY KEY (id),
  CONSTRAINT email_templates_user_id_name_key UNIQUE (user_id, name),
  CONSTRAINT email_templates_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
);

-- Email signatures
CREATE TABLE IF NOT EXISTS public.email_signatures (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  content text NOT NULL,
  is_default boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT email_signatures_pkey PRIMARY KEY (id),
  CONSTRAINT email_signatures_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
);

-- Email campaigns
CREATE TABLE IF NOT EXISTS public.email_campaigns (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  template_id uuid,
  subject text NOT NULL,
  html_content text NOT NULL,
  text_content text,
  -- Campaign settings
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sending', 'sent', 'paused', 'cancelled')),
  sender_name text,
  sender_email text NOT NULL,
  reply_to_email text,
  -- Scheduling
  scheduled_at timestamp with time zone,
  sent_at timestamp with time zone,
  -- Statistics
  total_recipients integer DEFAULT 0,
  sent_count integer DEFAULT 0,
  delivered_count integer DEFAULT 0,
  opened_count integer DEFAULT 0,
  clicked_count integer DEFAULT 0,
  bounced_count integer DEFAULT 0,
  unsubscribed_count integer DEFAULT 0,
  -- Tracking
  track_opens boolean DEFAULT true,
  track_clicks boolean DEFAULT true,
  -- Metadata
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT email_campaigns_pkey PRIMARY KEY (id),
  CONSTRAINT email_campaigns_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.email_templates(id),
  CONSTRAINT email_campaigns_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
);

-- Campaign recipients (linking prospects to campaigns)
CREATE TABLE IF NOT EXISTS public.campaign_recipients (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL,
  prospect_id uuid NOT NULL,
  prospect_list_id uuid NOT NULL,
  -- Prospect data snapshot for campaign
  prospect_data jsonb,
  recipient_email text NOT NULL,
  recipient_name text,
  -- Status tracking
  send_status text DEFAULT 'pending' CHECK (send_status IN ('pending', 'sent', 'delivered', 'bounced', 'failed')),
  sent_at timestamp with time zone,
  delivered_at timestamp with time zone,
  -- Tracking IDs
  tracking_id text UNIQUE,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT campaign_recipients_pkey PRIMARY KEY (id),
  CONSTRAINT campaign_recipients_campaign_id_prospect_id_key UNIQUE (campaign_id, prospect_id),
  CONSTRAINT campaign_recipients_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.email_campaigns(id) ON DELETE CASCADE,
  CONSTRAINT campaign_recipients_prospect_id_fkey FOREIGN KEY (prospect_id) REFERENCES public.prospects(id) ON DELETE CASCADE,
  CONSTRAINT campaign_recipients_prospect_list_id_fkey FOREIGN KEY (prospect_list_id) REFERENCES public.prospect_lists(id) ON DELETE CASCADE
);

-- Individual email sends tracking
CREATE TABLE IF NOT EXISTS public.email_sends (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL,
  recipient_id uuid NOT NULL,
  -- Email details
  message_id text,
  tracking_id text NOT NULL,
  smtp_response text,
  -- Status
  status text DEFAULT 'queued' CHECK (status IN ('queued', 'sent', 'delivered', 'bounced', 'failed')),
  error_message text,
  -- Timestamps
  queued_at timestamp with time zone DEFAULT now(),
  sent_at timestamp with time zone,
  delivered_at timestamp with time zone,
  bounced_at timestamp with time zone,
  CONSTRAINT email_sends_pkey PRIMARY KEY (id),
  CONSTRAINT email_sends_tracking_id_key UNIQUE (tracking_id),
  CONSTRAINT email_sends_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.email_campaigns(id) ON DELETE CASCADE,
  CONSTRAINT email_sends_recipient_id_fkey FOREIGN KEY (recipient_id) REFERENCES public.campaign_recipients(id) ON DELETE CASCADE
);

-- Email tracking events
CREATE TABLE IF NOT EXISTS public.email_tracking_events (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  send_id uuid NOT NULL,
  event_type text NOT NULL CHECK (event_type IN ('open', 'click', 'bounce', 'complaint', 'unsubscribe', 'reply', 'call')),
  -- Event data
  event_data jsonb DEFAULT '{}',
  user_agent text,
  ip_address inet,
  -- Link tracking (for clicks)
  clicked_url text,
  -- Metadata
  occurred_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT email_tracking_events_pkey PRIMARY KEY (id),
  CONSTRAINT email_tracking_events_send_id_fkey FOREIGN KEY (send_id) REFERENCES public.email_sends(id) ON DELETE CASCADE
);

-- Campaign analytics (aggregated data)
CREATE TABLE IF NOT EXISTS public.campaign_analytics (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL,
  date date NOT NULL,
  -- Daily metrics
  sent_count integer DEFAULT 0,
  delivered_count integer DEFAULT 0,
  opened_count integer DEFAULT 0,
  unique_opens integer DEFAULT 0,
  clicked_count integer DEFAULT 0,
  unique_clicks integer DEFAULT 0,
  bounced_count integer DEFAULT 0,
  unsubscribed_count integer DEFAULT 0,
  -- Rates (calculated)
  delivery_rate decimal(5,2),
  open_rate decimal(5,2),
  click_rate decimal(5,2),
  bounce_rate decimal(5,2),
  unsubscribe_rate decimal(5,2),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT campaign_analytics_pkey PRIMARY KEY (id),
  CONSTRAINT campaign_analytics_campaign_id_date_key UNIQUE (campaign_id, date),
  CONSTRAINT campaign_analytics_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.email_campaigns(id) ON DELETE CASCADE
);

-- Unsubscribe list (global)
CREATE TABLE IF NOT EXISTS public.email_unsubscribes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  email_address text NOT NULL,
  unsubscribed_at timestamp with time zone DEFAULT now(),
  campaign_id uuid,
  reason text,
  CONSTRAINT email_unsubscribes_pkey PRIMARY KEY (id),
  CONSTRAINT email_unsubscribes_email_address_key UNIQUE (email_address),
  CONSTRAINT email_unsubscribes_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.email_campaigns(id)
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Personal Email Indexes
CREATE INDEX IF NOT EXISTS idx_user_email_configs_user_id ON public.user_email_configs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_email_configs_email_address ON public.user_email_configs(email_address);
CREATE INDEX IF NOT EXISTS idx_email_folders_user_id ON public.email_folders(user_id);
CREATE INDEX IF NOT EXISTS idx_email_folders_email_config_id ON public.email_folders(email_config_id);
CREATE INDEX IF NOT EXISTS idx_personal_emails_user_id ON public.personal_emails(user_id);
CREATE INDEX IF NOT EXISTS idx_personal_emails_email_config_id ON public.personal_emails(email_config_id);
CREATE INDEX IF NOT EXISTS idx_personal_emails_folder_id ON public.personal_emails(folder_id);
CREATE INDEX IF NOT EXISTS idx_personal_emails_message_id ON public.personal_emails(message_id);
CREATE INDEX IF NOT EXISTS idx_personal_emails_thread_id ON public.personal_emails(thread_id);
CREATE INDEX IF NOT EXISTS idx_personal_emails_sent_at ON public.personal_emails(sent_at);
CREATE INDEX IF NOT EXISTS idx_personal_emails_is_read ON public.personal_emails(is_read);
CREATE INDEX IF NOT EXISTS idx_email_attachments_email_id ON public.email_attachments(email_id);
CREATE INDEX IF NOT EXISTS idx_email_labels_user_id ON public.email_labels(user_id);
CREATE INDEX IF NOT EXISTS idx_email_label_assignments_email_id ON public.email_label_assignments(email_id);
CREATE INDEX IF NOT EXISTS idx_email_label_assignments_label_id ON public.email_label_assignments(label_id);

-- Template and Signature Indexes
CREATE INDEX IF NOT EXISTS idx_email_templates_user_id ON public.email_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_email_signatures_user_id ON public.email_signatures(user_id);
CREATE INDEX IF NOT EXISTS idx_email_signatures_is_default ON public.email_signatures(user_id, is_default);

-- Campaign Indexes
CREATE INDEX IF NOT EXISTS idx_email_campaigns_user_id ON public.email_campaigns(user_id);
CREATE INDEX IF NOT EXISTS idx_email_campaigns_template_id ON public.email_campaigns(template_id);
CREATE INDEX IF NOT EXISTS idx_email_campaigns_status ON public.email_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_email_campaigns_scheduled_at ON public.email_campaigns(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_campaign_recipients_campaign_id ON public.campaign_recipients(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_recipients_prospect_id ON public.campaign_recipients(prospect_id);
CREATE INDEX IF NOT EXISTS idx_campaign_recipients_send_status ON public.campaign_recipients(send_status);
CREATE INDEX IF NOT EXISTS idx_email_sends_campaign_id ON public.email_sends(campaign_id);
CREATE INDEX IF NOT EXISTS idx_email_sends_recipient_id ON public.email_sends(recipient_id);
CREATE INDEX IF NOT EXISTS idx_email_sends_status ON public.email_sends(status);
CREATE INDEX IF NOT EXISTS idx_email_sends_tracking_id ON public.email_sends(tracking_id);
CREATE INDEX IF NOT EXISTS idx_email_tracking_events_send_id ON public.email_tracking_events(send_id);
CREATE INDEX IF NOT EXISTS idx_email_tracking_events_event_type ON public.email_tracking_events(event_type);
CREATE INDEX IF NOT EXISTS idx_email_tracking_events_occurred_at ON public.email_tracking_events(occurred_at);
CREATE INDEX IF NOT EXISTS idx_campaign_analytics_campaign_id ON public.campaign_analytics(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_analytics_date ON public.campaign_analytics(date);
CREATE INDEX IF NOT EXISTS idx_email_unsubscribes_email_address ON public.email_unsubscribes(email_address);

-- =====================================================
-- FUNCTIONS AND TRIGGERS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers to all tables
CREATE TRIGGER update_user_email_configs_updated_at
  BEFORE UPDATE ON public.user_email_configs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_email_folders_updated_at
  BEFORE UPDATE ON public.email_folders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_personal_emails_updated_at
  BEFORE UPDATE ON public.personal_emails
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_email_templates_updated_at
  BEFORE UPDATE ON public.email_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_email_signatures_updated_at
  BEFORE UPDATE ON public.email_signatures
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_email_campaigns_updated_at
  BEFORE UPDATE ON public.email_campaigns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_campaign_recipients_updated_at
  BEFORE UPDATE ON public.campaign_recipients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_campaign_analytics_updated_at
  BEFORE UPDATE ON public.campaign_analytics
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to update campaign statistics
CREATE OR REPLACE FUNCTION update_campaign_stats(campaign_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.email_campaigns
  SET
    sent_count = (SELECT COUNT(*) FROM public.email_sends WHERE campaign_id = $1 AND status = 'sent'),
    delivered_count = (SELECT COUNT(*) FROM public.email_sends WHERE campaign_id = $1 AND status = 'delivered'),
    opened_count = (SELECT COUNT(*) FROM public.email_tracking_events WHERE send_id IN (SELECT id FROM public.email_sends WHERE campaign_id = $1) AND event_type = 'open'),
    clicked_count = (SELECT COUNT(*) FROM public.email_tracking_events WHERE send_id IN (SELECT id FROM public.email_sends WHERE campaign_id = $1) AND event_type = 'click'),
    bounced_count = (SELECT COUNT(*) FROM public.email_sends WHERE campaign_id = $1 AND status = 'bounced'),
    unsubscribed_count = (SELECT COUNT(*) FROM public.email_tracking_events WHERE send_id IN (SELECT id FROM public.email_sends WHERE campaign_id = $1) AND event_type = 'unsubscribe'),
    updated_at = now()
  WHERE id = $1;
END;
$$;

-- Function to generate tracking ID
CREATE OR REPLACE FUNCTION generate_tracking_id()
RETURNS text
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN encode(gen_random_bytes(16), 'hex');
END;
$$;

-- Function to ensure only one default signature per user
CREATE OR REPLACE FUNCTION ensure_single_default_signature()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_default = true THEN
    UPDATE public.email_signatures
    SET is_default = false
    WHERE user_id = NEW.user_id AND id != NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ensure_single_default_signature_trigger
  BEFORE INSERT OR UPDATE ON public.email_signatures
  FOR EACH ROW EXECUTE FUNCTION ensure_single_default_signature();

-- =====================================================
-- ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE public.user_email_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.personal_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_label_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_sends ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_tracking_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_unsubscribes ENABLE ROW LEVEL SECURITY;

-- User Email Configs policies
CREATE POLICY "Users can view their own email configs"
  ON public.user_email_configs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own email configs"
  ON public.user_email_configs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own email configs"
  ON public.user_email_configs FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own email configs"
  ON public.user_email_configs FOR DELETE
  USING (auth.uid() = user_id);

-- Email Folders policies
CREATE POLICY "Users can view their own email folders"
  ON public.email_folders FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own email folders"
  ON public.email_folders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own email folders"
  ON public.email_folders FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own email folders"
  ON public.email_folders FOR DELETE
  USING (auth.uid() = user_id);

-- Personal Emails policies
CREATE POLICY "Users can view their own emails"
  ON public.personal_emails FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own emails"
  ON public.personal_emails FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own emails"
  ON public.personal_emails FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own emails"
  ON public.personal_emails FOR DELETE
  USING (auth.uid() = user_id);

-- Email Templates policies
CREATE POLICY "Users can view their own email templates"
  ON public.email_templates FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own email templates"
  ON public.email_templates FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own email templates"
  ON public.email_templates FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own email templates"
  ON public.email_templates FOR DELETE
  USING (auth.uid() = user_id);

-- Email Signatures policies
CREATE POLICY "Users can view their own email signatures"
  ON public.email_signatures FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own email signatures"
  ON public.email_signatures FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own email signatures"
  ON public.email_signatures FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own email signatures"
  ON public.email_signatures FOR DELETE
  USING (auth.uid() = user_id);

-- Email Campaigns policies
CREATE POLICY "Users can view their own email campaigns"
  ON public.email_campaigns FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own email campaigns"
  ON public.email_campaigns FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own email campaigns"
  ON public.email_campaigns FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own email campaigns"
  ON public.email_campaigns FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- INITIAL DATA
-- =====================================================

-- Insert default email labels for existing users
INSERT INTO public.email_labels (user_id, label_name, label_color)
SELECT DISTINCT
  u.id as user_id,
  label_name,
  label_color
FROM public.users u
CROSS JOIN (
  VALUES
    ('Important', '#EF4444'),
    ('Work', '#3B82F6'),
    ('Personal', '#10B981'),
    ('Follow Up', '#F59E0B')
) AS labels(label_name, label_color)
ON CONFLICT (user_id, label_name) DO NOTHING;
