-- =====================================================
-- RECREATE ALL TABLES - CLEAN SLATE
-- Based on the user's actual table schema
-- =====================================================

-- =====================================================
-- CORE TABLES
-- =====================================================

-- Create users table (referenced by many other tables)
-- IMPORTANT: This table should already exist, but we'll recreate it if needed
CREATE TABLE IF NOT EXISTS public.users (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  full_name text,
  email text NOT NULL,
  role text DEFAULT 'user' CHECK (role IN ('admin', 'commercial', 'dev')),
  avatar_url text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT users_pkey PRIMARY KEY (id),
  CONSTRAINT users_email_key UNIQUE (email)
);

-- =====================================================
-- SYNC AUTH.USERS TO PUBLIC.USERS
-- =====================================================

-- Insert users from auth.users into public.users (only if they don't exist)
INSERT INTO public.users (id, full_name, email, created_at)
SELECT
  au.id,
  COALESCE(
    au.raw_user_meta_data->>'full_name',
    au.raw_user_meta_data->>'name',
    au.raw_user_meta_data->>'display_name',
    SPLIT_PART(au.email, '@', 1)
  ) as full_name,
  au.email,
  au.created_at
FROM auth.users au
WHERE NOT EXISTS (
  SELECT 1 FROM public.users pu WHERE pu.id = au.id
)
AND au.email IS NOT NULL
ON CONFLICT (id) DO NOTHING;

-- Update existing users with latest data from auth.users
UPDATE public.users
SET
  full_name = COALESCE(
    au.raw_user_meta_data->>'full_name',
    au.raw_user_meta_data->>'name',
    au.raw_user_meta_data->>'display_name',
    SPLIT_PART(au.email, '@', 1)
  ),
  email = au.email,
  updated_at = now()
FROM auth.users au
WHERE public.users.id = au.id;

-- Create prospect_lists table
CREATE TABLE IF NOT EXISTS public.prospect_lists (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  description text,
  status text DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
  created_by uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  prospect_count integer DEFAULT 0,
  CONSTRAINT prospect_lists_pkey PRIMARY KEY (id),
  CONSTRAINT prospect_lists_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE CASCADE
);

-- Create prospects table (using the user's actual schema)
CREATE TABLE public.prospects (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  list_id uuid NOT NULL,
  data jsonb NOT NULL,
  phone_number text NULL,
  phone_column text NULL,
  has_phone boolean NULL DEFAULT false,
  created_by uuid NOT NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  status text NULL DEFAULT 'nouveau'::text,
  commentaire text NULL,
  rappel_date timestamp with time zone NULL,
  assigned_to uuid NULL,
  CONSTRAINT prospects_pkey PRIMARY KEY (id),
  CONSTRAINT prospects_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.users(id) ON DELETE SET NULL,
  CONSTRAINT prospects_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id),
  CONSTRAINT prospects_list_id_fkey FOREIGN KEY (list_id) REFERENCES prospect_lists(id) ON DELETE CASCADE,
  CONSTRAINT prospects_status_check CHECK ((status = ANY (ARRAY['nouveau'::text, 'contacte'::text, 'interesse'::text, 'non_interesse'::text, 'rappel'::text, 'ferme'::text])))
);

-- Create prospect_interlocuteurs table
CREATE TABLE IF NOT EXISTS public.prospect_interlocuteurs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  prospect_id uuid NOT NULL,
  name text NOT NULL,
  email text,
  phone text,
  position text,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT prospect_interlocuteurs_pkey PRIMARY KEY (id),
  CONSTRAINT prospect_interlocuteurs_prospect_id_fkey FOREIGN KEY (prospect_id) REFERENCES public.prospects(id) ON DELETE CASCADE
);

-- Create prospect_activities table
CREATE TABLE IF NOT EXISTS public.prospect_activities (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  prospect_id uuid NOT NULL,
  user_id uuid NOT NULL,
  activity_type text NOT NULL CHECK (activity_type IN ('call', 'email', 'meeting', 'note', 'status_change', 'assignment')),
  description text,
  metadata jsonb,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT prospect_activities_pkey PRIMARY KEY (id),
  CONSTRAINT prospect_activities_prospect_id_fkey FOREIGN KEY (prospect_id) REFERENCES public.prospects(id) ON DELETE CASCADE,
  CONSTRAINT prospect_activities_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create prospect_assignments table
CREATE TABLE IF NOT EXISTS public.prospect_assignments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  prospect_id uuid NOT NULL,
  user_id uuid NOT NULL,
  assigned_by uuid NOT NULL,
  assigned_at timestamp with time zone DEFAULT now(),
  UNIQUE(prospect_id, user_id),
  CONSTRAINT prospect_assignments_pkey PRIMARY KEY (id),
  CONSTRAINT prospect_assignments_prospect_id_fkey FOREIGN KEY (prospect_id) REFERENCES public.prospects(id) ON DELETE CASCADE,
  CONSTRAINT prospect_assignments_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT prospect_assignments_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- =====================================================
-- EMAIL SYSTEM TABLES
-- =====================================================

-- User email configurations (IMAP/SMTP settings)
CREATE TABLE IF NOT EXISTS public.user_email_configs (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
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
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
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
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
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
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
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

-- Email templates
CREATE TABLE IF NOT EXISTS public.email_templates (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  subject text NOT NULL,
  html_content text NOT NULL,
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

-- =====================================================
-- MESSAGERIE TABLES
-- =====================================================

-- Create conversations table
CREATE TABLE IF NOT EXISTS public.conversations (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  title text,
  created_by uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  is_group boolean DEFAULT false,
  last_message_at timestamp with time zone DEFAULT now(),
  CONSTRAINT conversations_pkey PRIMARY KEY (id),
  CONSTRAINT conversations_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE CASCADE
);

-- Create message_participants table
CREATE TABLE IF NOT EXISTS public.message_participants (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  conversation_id uuid NOT NULL,
  user_id uuid NOT NULL,
  joined_at timestamp with time zone DEFAULT now(),
  last_read_at timestamp with time zone,
  is_admin boolean DEFAULT false,
  CONSTRAINT message_participants_pkey PRIMARY KEY (id),
  CONSTRAINT message_participants_conversation_user_key UNIQUE (conversation_id, user_id),
  CONSTRAINT message_participants_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE CASCADE,
  CONSTRAINT message_participants_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
);

-- Create messages table
CREATE TABLE IF NOT EXISTS public.messages (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  conversation_id uuid NOT NULL,
  sender_id uuid NOT NULL,
  content text NOT NULL,
  message_type text DEFAULT 'text' CHECK (message_type IN ('text', 'file', 'image', 'system')),
  metadata jsonb DEFAULT '{}',
  is_pinned boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT messages_pkey PRIMARY KEY (id),
  CONSTRAINT messages_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE CASCADE,
  CONSTRAINT messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.users(id) ON DELETE CASCADE
);

-- =====================================================
-- NOTIFICATIONS TABLES
-- =====================================================

-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  data jsonb,
  is_read boolean DEFAULT false,
  priority text DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  expires_at timestamp with time zone,
  action_url text,
  action_label text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Users indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);

-- Prospects indexes
CREATE INDEX IF NOT EXISTS idx_prospects_list_id ON public.prospects(list_id);
CREATE INDEX IF NOT EXISTS idx_prospects_has_phone ON public.prospects(has_phone);
CREATE INDEX IF NOT EXISTS idx_prospects_data ON public.prospects USING gin(data);
CREATE INDEX IF NOT EXISTS idx_prospects_rappel_date ON public.prospects(rappel_date);
CREATE INDEX IF NOT EXISTS idx_prospects_status ON public.prospects(status);
CREATE INDEX IF NOT EXISTS idx_prospects_assigned_to ON public.prospects(assigned_to);
CREATE INDEX IF NOT EXISTS idx_prospects_list_assigned ON public.prospects(list_id, assigned_to);

-- Prospect lists indexes
CREATE INDEX IF NOT EXISTS idx_prospect_lists_created_by ON public.prospect_lists(created_by);
CREATE INDEX IF NOT EXISTS idx_prospect_lists_status ON public.prospect_lists(status);

-- Prospect interlocuteurs indexes
CREATE INDEX IF NOT EXISTS idx_prospect_interlocuteurs_prospect_id ON public.prospect_interlocuteurs(prospect_id);

-- Prospect activities indexes
CREATE INDEX IF NOT EXISTS idx_prospect_activities_prospect_id ON public.prospect_activities(prospect_id);
CREATE INDEX IF NOT EXISTS idx_prospect_activities_user_id ON public.prospect_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_prospect_activities_created_at ON public.prospect_activities(created_at);

-- Prospect assignments indexes
CREATE INDEX IF NOT EXISTS idx_prospect_assignments_prospect_id ON public.prospect_assignments(prospect_id);
CREATE INDEX IF NOT EXISTS idx_prospect_assignments_user_id ON public.prospect_assignments(user_id);

-- Email system indexes
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
CREATE INDEX IF NOT EXISTS idx_email_templates_user_id ON public.email_templates(user_id);

-- Messagerie indexes
CREATE INDEX IF NOT EXISTS idx_conversations_created_by ON public.conversations(created_by);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message_at ON public.conversations(last_message_at);
CREATE INDEX IF NOT EXISTS idx_message_participants_conversation_id ON public.message_participants(conversation_id);
CREATE INDEX IF NOT EXISTS idx_message_participants_user_id ON public.message_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at);
CREATE INDEX IF NOT EXISTS idx_messages_is_pinned ON public.messages(is_pinned) WHERE is_pinned = true;
CREATE INDEX IF NOT EXISTS idx_messages_conversation_pinned ON public.messages(conversation_id, is_pinned) WHERE is_pinned = true;

-- Notifications indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON public.notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications(user_id, is_read) WHERE is_read = false;

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

-- Function to update prospect count on prospect_lists
CREATE OR REPLACE FUNCTION update_prospect_list_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.prospect_lists
    SET prospect_count = prospect_count + 1
    WHERE id = NEW.list_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.prospect_lists
    SET prospect_count = prospect_count - 1
    WHERE id = OLD.list_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Function to update prospects updated_at
CREATE OR REPLACE FUNCTION update_prospects_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to detect phone numbers
CREATE OR REPLACE FUNCTION detect_phone_numbers()
RETURNS TRIGGER AS $$
BEGIN
  -- Simple phone number detection logic
  NEW.has_phone = (
    NEW.phone_number IS NOT NULL AND LENGTH(TRIM(NEW.phone_number)) > 0
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to generate tracking ID
CREATE OR REPLACE FUNCTION generate_tracking_id()
RETURNS text
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN encode(gen_random_bytes(16), 'hex');
END;
$$;

-- Function to clean up expired notifications
CREATE OR REPLACE FUNCTION cleanup_expired_notifications()
RETURNS void AS $$
BEGIN
  DELETE FROM notifications
  WHERE expires_at IS NOT NULL
    AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Apply updated_at triggers
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_prospect_lists_updated_at
  BEFORE UPDATE ON public.prospect_lists
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_prospects_updated_at
  BEFORE UPDATE ON public.prospects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_prospect_interlocuteurs_updated_at
  BEFORE UPDATE ON public.prospect_interlocuteurs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_prospect_activities_updated_at
  BEFORE UPDATE ON public.prospect_activities
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_conversations_updated_at
  BEFORE UPDATE ON public.conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_messages_updated_at
  BEFORE UPDATE ON public.messages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notifications_updated_at
  BEFORE UPDATE ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Email system triggers
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

-- Prospect count triggers
CREATE TRIGGER trigger_update_prospect_count_delete
  AFTER DELETE ON public.prospects
  FOR EACH ROW EXECUTE FUNCTION update_prospect_list_count();

CREATE TRIGGER trigger_update_prospect_count_insert
  AFTER INSERT ON public.prospects
  FOR EACH ROW EXECUTE FUNCTION update_prospect_list_count();

-- Phone detection trigger
CREATE TRIGGER trigger_detect_phones
  BEFORE INSERT OR UPDATE OF data, phone_number ON public.prospects
  FOR EACH ROW EXECUTE FUNCTION detect_phone_numbers();

-- =====================================================
-- INITIAL DATA
-- =====================================================

-- Note: You may want to insert initial data here if needed
