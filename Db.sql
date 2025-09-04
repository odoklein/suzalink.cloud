-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.booking_answers (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  booking_id uuid NOT NULL,
  question_id text NOT NULL,
  answer text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT booking_answers_pkey PRIMARY KEY (id),
  CONSTRAINT booking_answers_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id)
);
CREATE TABLE public.bookings (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  meeting_type_id uuid NOT NULL,
  host_user_id uuid NOT NULL,
  guest_name text NOT NULL,
  guest_email text NOT NULL,
  guest_phone text,
  start_time timestamp with time zone NOT NULL,
  end_time timestamp with time zone NOT NULL,
  status text NOT NULL DEFAULT 'confirmed'::text CHECK (status = ANY (ARRAY['confirmed'::text, 'pending'::text, 'cancelled'::text, 'completed'::text])),
  notes text,
  meeting_link text,
  location text,
  client_id uuid,
  prospect_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT bookings_pkey PRIMARY KEY (id),
  CONSTRAINT bookings_host_user_id_fkey FOREIGN KEY (host_user_id) REFERENCES public.users(id),
  CONSTRAINT bookings_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id),
  CONSTRAINT bookings_prospect_id_fkey FOREIGN KEY (prospect_id) REFERENCES public.list_items(id),
  CONSTRAINT bookings_meeting_type_id_fkey FOREIGN KEY (meeting_type_id) REFERENCES public.meeting_types(id)
);
CREATE TABLE public.clients (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid,
  name text NOT NULL,
  contact_email text NOT NULL,
  company text,
  phone text,
  status text NOT NULL DEFAULT 'active'::text CHECK (status = ANY (ARRAY['active'::text, 'inactive'::text, 'prospect'::text])),
  region text,
  industry text,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT clients_pkey PRIMARY KEY (id),
  CONSTRAINT clients_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.conversation_participants (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  conversation_id uuid NOT NULL,
  user_id uuid NOT NULL,
  joined_at timestamp with time zone DEFAULT now(),
  CONSTRAINT conversation_participants_pkey PRIMARY KEY (id),
  CONSTRAINT conversation_participants_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(id),
  CONSTRAINT conversation_participants_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.conversations (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  type text NOT NULL DEFAULT 'direct'::text CHECK (type = ANY (ARRAY['direct'::text, 'group'::text])),
  title text,
  created_by uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT conversations_pkey PRIMARY KEY (id),
  CONSTRAINT conversations_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id)
);
CREATE TABLE public.email_attachments (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  email_id uuid NOT NULL,
  filename text NOT NULL,
  content_type text NOT NULL,
  size_bytes integer NOT NULL,
  file_data bytea,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT email_attachments_pkey PRIMARY KEY (id),
  CONSTRAINT email_attachments_email_id_fkey FOREIGN KEY (email_id) REFERENCES public.emails(id)
);
CREATE TABLE public.email_folders (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  display_name text NOT NULL,
  imap_path text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT email_folders_pkey PRIMARY KEY (id),
  CONSTRAINT email_folders_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.emails (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  folder_id uuid NOT NULL,
  message_id text,
  imap_uid text,
  from_name text,
  from_address text NOT NULL,
  to_addresses ARRAY,
  cc_addresses ARRAY,
  bcc_addresses ARRAY,
  subject text,
  text_content text,
  html_content text,
  date_received timestamp with time zone NOT NULL,
  is_read boolean DEFAULT false,
  is_starred boolean DEFAULT false,
  is_deleted boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT emails_pkey PRIMARY KEY (id),
  CONSTRAINT emails_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT emails_folder_id_fkey FOREIGN KEY (folder_id) REFERENCES public.email_folders(id)
);
CREATE TABLE public.factures (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  client_id uuid,
  user_id uuid,
  invoice_number text NOT NULL UNIQUE,
  services jsonb,
  date date NOT NULL,
  subtotal numeric NOT NULL,
  tax_rate numeric DEFAULT 0,
  tax_amount numeric DEFAULT 0,
  total numeric NOT NULL,
  status text NOT NULL DEFAULT 'draft'::text CHECK (status = ANY (ARRAY['draft'::text, 'sent'::text, 'paid'::text, 'overdue'::text, 'cancelled'::text])),
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT factures_pkey PRIMARY KEY (id),
  CONSTRAINT factures_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id),
  CONSTRAINT factures_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.folders (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  user_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  client_id uuid,
  CONSTRAINT folders_pkey PRIMARY KEY (id),
  CONSTRAINT folders_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id),
  CONSTRAINT folders_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.list_items (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  list_id uuid NOT NULL,
  data jsonb NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT list_items_pkey PRIMARY KEY (id),
  CONSTRAINT list_items_list_id_fkey FOREIGN KEY (list_id) REFERENCES public.lists(id)
);
CREATE TABLE public.lists (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  folder_id uuid NOT NULL,
  user_id uuid NOT NULL,
  csv_url text,
  columns jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  client_id uuid,
  CONSTRAINT lists_pkey PRIMARY KEY (id),
  CONSTRAINT lists_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT lists_folder_id_fkey FOREIGN KEY (folder_id) REFERENCES public.folders(id),
  CONSTRAINT lists_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id)
);
CREATE TABLE public.meeting_types (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  duration_minutes integer NOT NULL DEFAULT 30,
  price numeric,
  color text DEFAULT '#3B82F6'::text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT meeting_types_pkey PRIMARY KEY (id),
  CONSTRAINT meeting_types_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.messages (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  conversation_id uuid NOT NULL,
  sender_id uuid NOT NULL,
  content text NOT NULL,
  file_url text,
  is_read boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT messages_pkey PRIMARY KEY (id),
  CONSTRAINT messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.users(id),
  CONSTRAINT messages_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(id)
);
CREATE TABLE public.projects (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'active'::text CHECK (status = ANY (ARRAY['active'::text, 'completed'::text, 'on_hold'::text, 'cancelled'::text, 'archived'::text])),
  client_id uuid,
  user_id uuid,
  start_date date,
  end_date date,
  budget numeric,
  progress numeric DEFAULT 0 CHECK (progress >= 0::numeric AND progress <= 1::numeric),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT projects_pkey PRIMARY KEY (id),
  CONSTRAINT projects_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT projects_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id)
);
CREATE TABLE public.prospect_action_logs (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  list_id uuid,
  prospect_id uuid,
  action_type text NOT NULL,
  old_data jsonb,
  new_data jsonb,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT prospect_action_logs_pkey PRIMARY KEY (id),
  CONSTRAINT prospect_action_logs_prospect_id_fkey FOREIGN KEY (prospect_id) REFERENCES public.list_items(id),
  CONSTRAINT prospect_action_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT prospect_action_logs_list_id_fkey FOREIGN KEY (list_id) REFERENCES public.lists(id)
);
CREATE TABLE public.task_attachments (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  task_id uuid NOT NULL,
  filename text NOT NULL,
  file_url text NOT NULL,
  file_size integer,
  content_type text,
  uploaded_by uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT task_attachments_pkey PRIMARY KEY (id),
  CONSTRAINT task_attachments_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(id),
  CONSTRAINT task_attachments_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.users(id)
);
CREATE TABLE public.task_comments (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  task_id uuid NOT NULL,
  user_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT task_comments_pkey PRIMARY KEY (id),
  CONSTRAINT task_comments_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(id),
  CONSTRAINT task_comments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.tasks (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'todo'::text CHECK (status = ANY (ARRAY['todo'::text, 'doing'::text, 'done'::text])),
  priority text NOT NULL DEFAULT 'medium'::text CHECK (priority = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text])),
  project_id uuid NOT NULL,
  assignee_id uuid,
  created_by uuid NOT NULL,
  due_date date,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT tasks_pkey PRIMARY KEY (id),
  CONSTRAINT tasks_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id),
  CONSTRAINT tasks_assignee_id_fkey FOREIGN KEY (assignee_id) REFERENCES public.users(id),
  CONSTRAINT tasks_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id)
);
CREATE TABLE public.user_activity (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  action text NOT NULL,
  details text,
  target_user_id uuid,
  ip_address inet,
  user_agent text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_activity_pkey PRIMARY KEY (id),
  CONSTRAINT user_activity_target_user_id_fkey FOREIGN KEY (target_user_id) REFERENCES public.users(id),
  CONSTRAINT user_activity_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.user_calendar_settings (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL UNIQUE,
  timezone text NOT NULL DEFAULT 'Europe/Paris'::text,
  working_hours jsonb NOT NULL DEFAULT '{"friday": {"end": "17:00", "start": "09:00", "enabled": true}, "monday": {"end": "17:00", "start": "09:00", "enabled": true}, "sunday": {"end": "17:00", "start": "09:00", "enabled": false}, "tuesday": {"end": "17:00", "start": "09:00", "enabled": true}, "saturday": {"end": "17:00", "start": "09:00", "enabled": false}, "thursday": {"end": "17:00", "start": "09:00", "enabled": true}, "wednesday": {"end": "17:00", "start": "09:00", "enabled": true}}'::jsonb,
  break_time_minutes integer DEFAULT 60,
  slot_duration_minutes integer DEFAULT 30,
  advance_booking_days integer DEFAULT 30,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_calendar_settings_pkey PRIMARY KEY (id),
  CONSTRAINT user_calendar_settings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.user_email_credentials (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL UNIQUE,
  imap_username text NOT NULL,
  imap_password text NOT NULL,
  smtp_username text NOT NULL,
  smtp_password text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_email_credentials_pkey PRIMARY KEY (id),
  CONSTRAINT user_email_credentials_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.users (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  email text NOT NULL UNIQUE,
  full_name text NOT NULL,
  role text NOT NULL DEFAULT 'user'::text CHECK (role = ANY (ARRAY['admin'::text, 'manager'::text, 'user'::text])),
  profile_picture_url text,
  username text UNIQUE,
  phone text,
  location text,
  job_title text,
  department text,
  bio text,
  birthday date,
  linkedin_url text,
  website_url text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT users_pkey PRIMARY KEY (id)
);

[
  {
    "table_schema": "auth",
    "table_name": "audit_log_entries"
  },
  {
    "table_schema": "auth",
    "table_name": "flow_state"
  },
  {
    "table_schema": "auth",
    "table_name": "identities"
  },
  {
    "table_schema": "auth",
    "table_name": "instances"
  },
  {
    "table_schema": "auth",
    "table_name": "mfa_amr_claims"
  },
  {
    "table_schema": "auth",
    "table_name": "mfa_challenges"
  },
  {
    "table_schema": "auth",
    "table_name": "mfa_factors"
  },
  {
    "table_schema": "auth",
    "table_name": "oauth_clients"
  },
  {
    "table_schema": "auth",
    "table_name": "one_time_tokens"
  },
  {
    "table_schema": "auth",
    "table_name": "refresh_tokens"
  },
  {
    "table_schema": "auth",
    "table_name": "saml_providers"
  },
  {
    "table_schema": "auth",
    "table_name": "saml_relay_states"
  },
  {
    "table_schema": "auth",
    "table_name": "schema_migrations"
  },
  {
    "table_schema": "auth",
    "table_name": "sessions"
  },
  {
    "table_schema": "auth",
    "table_name": "sso_domains"
  },
  {
    "table_schema": "auth",
    "table_name": "sso_providers"
  },
  {
    "table_schema": "auth",
    "table_name": "users"
  },
  {
    "table_schema": "extensions",
    "table_name": "pg_stat_statements"
  },
  {
    "table_schema": "extensions",
    "table_name": "pg_stat_statements_info"
  },
  {
    "table_schema": "public",
    "table_name": "booking_answers"
  },
  {
    "table_schema": "public",
    "table_name": "bookings"
  },
  {
    "table_schema": "public",
    "table_name": "clients"
  },
  {
    "table_schema": "public",
    "table_name": "conversation_participants"
  },
  {
    "table_schema": "public",
    "table_name": "conversations"
  },
  {
    "table_schema": "public",
    "table_name": "email_attachments"
  },
  {
    "table_schema": "public",
    "table_name": "email_folders"
  },
  {
    "table_schema": "public",
    "table_name": "emails"
  },
  {
    "table_schema": "public",
    "table_name": "factures"
  },
  {
    "table_schema": "public",
    "table_name": "folders"
  },
  {
    "table_schema": "public",
    "table_name": "list_items"
  },
  {
    "table_schema": "public",
    "table_name": "lists"
  },
  {
    "table_schema": "public",
    "table_name": "meeting_types"
  },
  {
    "table_schema": "public",
    "table_name": "messages"
  },
  {
    "table_schema": "public",
    "table_name": "projects"
  },
  {
    "table_schema": "public",
    "table_name": "prospect_action_logs"
  },
  {
    "table_schema": "public",
    "table_name": "task_attachments"
  },
  {
    "table_schema": "public",
    "table_name": "task_comments"
  },
  {
    "table_schema": "public",
    "table_name": "tasks"
  },
  {
    "table_schema": "public",
    "table_name": "user_activity"
  },
  {
    "table_schema": "public",
    "table_name": "user_calendar_settings"
  },
  {
    "table_schema": "public",
    "table_name": "user_email_credentials"
  },
  {
    "table_schema": "public",
    "table_name": "users"
  },
  {
    "table_schema": "realtime",
    "table_name": "messages"
  },
  {
    "table_schema": "realtime",
    "table_name": "schema_migrations"
  },
  {
    "table_schema": "realtime",
    "table_name": "subscription"
  },
  {
    "table_schema": "storage",
    "table_name": "buckets"
  },
  {
    "table_schema": "storage",
    "table_name": "buckets_analytics"
  },
  {
    "table_schema": "storage",
    "table_name": "migrations"
  },
  {
    "table_schema": "storage",
    "table_name": "objects"
  },
  {
    "table_schema": "storage",
    "table_name": "prefixes"
  },
  {
    "table_schema": "storage",
    "table_name": "s3_multipart_uploads"
  },
  {
    "table_schema": "storage",
    "table_name": "s3_multipart_uploads_parts"
  },
  {
    "table_schema": "vault",
    "table_name": "decrypted_secrets"
  },
  {
    "table_schema": "vault",
    "table_name": "secrets"
  }
]



**rls**

[
  {
    "schema": "storage",
    "table": "objects",
    "policy": "Allow all operations for authenticated users",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "with_check": null
  }
]



**triggers**

[
  {
    "schema": "storage",
    "table": "objects",
    "trigger_name": "update_objects_updated_at",
    "definition": "CREATE TRIGGER update_objects_updated_at BEFORE UPDATE ON storage.objects FOR EACH ROW EXECUTE FUNCTION storage.update_updated_at_column()",
    "enabled": "O"
  },
  {
    "schema": "realtime",
    "table": "subscription",
    "trigger_name": "tr_check_filters",
    "definition": "CREATE TRIGGER tr_check_filters BEFORE INSERT OR UPDATE ON realtime.subscription FOR EACH ROW EXECUTE FUNCTION realtime.subscription_check_filters()",
    "enabled": "O"
  },
  {
    "schema": "public",
    "table": "users",
    "trigger_name": "update_users_updated_at",
    "definition": "CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()",
    "enabled": "O"
  },
  {
    "schema": "public",
    "table": "clients",
    "trigger_name": "update_clients_updated_at",
    "definition": "CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()",
    "enabled": "O"
  },
  {
    "schema": "public",
    "table": "projects",
    "trigger_name": "update_projects_updated_at",
    "definition": "CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()",
    "enabled": "O"
  },
  {
    "schema": "public",
    "table": "folders",
    "trigger_name": "update_folders_updated_at",
    "definition": "CREATE TRIGGER update_folders_updated_at BEFORE UPDATE ON public.folders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()",
    "enabled": "O"
  },
  {
    "schema": "public",
    "table": "lists",
    "trigger_name": "update_lists_updated_at",
    "definition": "CREATE TRIGGER update_lists_updated_at BEFORE UPDATE ON public.lists FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()",
    "enabled": "O"
  },
  {
    "schema": "public",
    "table": "list_items",
    "trigger_name": "update_list_items_updated_at",
    "definition": "CREATE TRIGGER update_list_items_updated_at BEFORE UPDATE ON public.list_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()",
    "enabled": "O"
  },
  {
    "schema": "public",
    "table": "meeting_types",
    "trigger_name": "update_meeting_types_updated_at",
    "definition": "CREATE TRIGGER update_meeting_types_updated_at BEFORE UPDATE ON public.meeting_types FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()",
    "enabled": "O"
  },
  {
    "schema": "public",
    "table": "bookings",
    "trigger_name": "update_bookings_updated_at",
    "definition": "CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON public.bookings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()",
    "enabled": "O"
  },
  {
    "schema": "public",
    "table": "user_email_credentials",
    "trigger_name": "update_user_email_credentials_updated_at",
    "definition": "CREATE TRIGGER update_user_email_credentials_updated_at BEFORE UPDATE ON public.user_email_credentials FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()",
    "enabled": "O"
  },
  {
    "schema": "public",
    "table": "email_folders",
    "trigger_name": "update_email_folders_updated_at",
    "definition": "CREATE TRIGGER update_email_folders_updated_at BEFORE UPDATE ON public.email_folders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()",
    "enabled": "O"
  },
  {
    "schema": "public",
    "table": "emails",
    "trigger_name": "update_emails_updated_at",
    "definition": "CREATE TRIGGER update_emails_updated_at BEFORE UPDATE ON public.emails FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()",
    "enabled": "O"
  },
  {
    "schema": "public",
    "table": "conversations",
    "trigger_name": "update_conversations_updated_at",
    "definition": "CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON public.conversations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()",
    "enabled": "O"
  },
  {
    "schema": "public",
    "table": "messages",
    "trigger_name": "update_messages_updated_at",
    "definition": "CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON public.messages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()",
    "enabled": "O"
  },
  {
    "schema": "public",
    "table": "factures",
    "trigger_name": "update_factures_updated_at",
    "definition": "CREATE TRIGGER update_factures_updated_at BEFORE UPDATE ON public.factures FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()",
    "enabled": "O"
  },
  {
    "schema": "public",
    "table": "user_calendar_settings",
    "trigger_name": "update_user_calendar_settings_updated_at",
    "definition": "CREATE TRIGGER update_user_calendar_settings_updated_at BEFORE UPDATE ON public.user_calendar_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()",
    "enabled": "O"
  },
  {
    "schema": "auth",
    "table": "users",
    "trigger_name": "on_auth_user_created",
    "definition": "CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_new_user()",
    "enabled": "O"
  },
  {
    "schema": "auth",
    "table": "users",
    "trigger_name": "on_auth_user_updated",
    "definition": "CREATE TRIGGER on_auth_user_updated AFTER UPDATE ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_user_update()",
    "enabled": "O"
  },
  {
    "schema": "storage",
    "table": "prefixes",
    "trigger_name": "prefixes_delete_hierarchy",
    "definition": "CREATE TRIGGER prefixes_delete_hierarchy AFTER DELETE ON storage.prefixes FOR EACH ROW EXECUTE FUNCTION storage.delete_prefix_hierarchy_trigger()",
    "enabled": "O"
  },
  {
    "schema": "storage",
    "table": "objects",
    "trigger_name": "objects_insert_create_prefix",
    "definition": "CREATE TRIGGER objects_insert_create_prefix BEFORE INSERT ON storage.objects FOR EACH ROW EXECUTE FUNCTION storage.objects_insert_prefix_trigger()",
    "enabled": "O"
  },
  {
    "schema": "storage",
    "table": "objects",
    "trigger_name": "objects_delete_delete_prefix",
    "definition": "CREATE TRIGGER objects_delete_delete_prefix AFTER DELETE ON storage.objects FOR EACH ROW EXECUTE FUNCTION storage.delete_prefix_hierarchy_trigger()",
    "enabled": "O"
  },
  {
    "schema": "storage",
    "table": "prefixes",
    "trigger_name": "prefixes_create_hierarchy",
    "definition": "CREATE TRIGGER prefixes_create_hierarchy BEFORE INSERT ON storage.prefixes FOR EACH ROW WHEN ((pg_trigger_depth() < 1)) EXECUTE FUNCTION storage.prefixes_insert_trigger()",
    "enabled": "O"
  },
  {
    "schema": "storage",
    "table": "objects",
    "trigger_name": "objects_update_create_prefix",
    "definition": "CREATE TRIGGER objects_update_create_prefix BEFORE UPDATE ON storage.objects FOR EACH ROW WHEN (((new.name <> old.name) OR (new.bucket_id <> old.bucket_id))) EXECUTE FUNCTION storage.objects_update_prefix_trigger()",
    "enabled": "O"
  },
  {
    "schema": "storage",
    "table": "buckets",
    "trigger_name": "enforce_bucket_name_length_trigger",
    "definition": "CREATE TRIGGER enforce_bucket_name_length_trigger BEFORE INSERT OR UPDATE OF name ON storage.buckets FOR EACH ROW EXECUTE FUNCTION storage.enforce_bucket_name_length()",
    "enabled": "O"
  }
]