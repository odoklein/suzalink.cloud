-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

-- Create user roles enum
CREATE TYPE user_role AS ENUM ('admin', 'manager', 'user');

CREATE TABLE public.chat_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  chat_id uuid NOT NULL,
  sender_id uuid,
  content text NOT NULL,
  sent_at timestamp with time zone DEFAULT now(),
  file_url text,
  CONSTRAINT chat_messages_pkey PRIMARY KEY (id),
  CONSTRAINT chat_messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES auth.users(id),
  CONSTRAINT chat_messages_chat_id_fkey FOREIGN KEY (chat_id) REFERENCES public.chats(id)
);
CREATE TABLE public.chat_participants (
  chat_id uuid NOT NULL,
  user_id uuid NOT NULL,
  added_at timestamp with time zone DEFAULT now(),
  CONSTRAINT chat_participants_pkey PRIMARY KEY (chat_id, user_id),
  CONSTRAINT chat_participants_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT chat_participants_chat_id_fkey FOREIGN KEY (chat_id) REFERENCES public.chats(id)
);
CREATE TABLE public.chats (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  type USER-DEFINED NOT NULL,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  project_id uuid,
  CONSTRAINT chats_pkey PRIMARY KEY (id),
  CONSTRAINT chats_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id),
  CONSTRAINT chats_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id)
);
CREATE TYPE client_status AS ENUM ('active', 'pending', 'inactive');

CREATE TABLE public.clients (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  contact_email text NOT NULL,
  company text,
  status client_status NOT NULL DEFAULT 'active',
  region text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT clients_pkey PRIMARY KEY (id)
);
CREATE TABLE public.email_accounts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  email text NOT NULL,
  imap_host text NOT NULL,
  imap_port integer NOT NULL,
  smtp_host text NOT NULL,
  smtp_port integer NOT NULL,
  password text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT email_accounts_pkey PRIMARY KEY (id),
  CONSTRAINT email_accounts_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.entries (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  type text CHECK (type = ANY (ARRAY['income'::text, 'expense'::text])),
  amount numeric NOT NULL,
  description text,
  date date NOT NULL,
  CONSTRAINT entries_pkey PRIMARY KEY (id)
);
CREATE TABLE public.finance (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  title text NOT NULL,
  amount numeric NOT NULL,
  type text NOT NULL CHECK (type = ANY (ARRAY['income'::text, 'expense'::text])),
  category text,
  date timestamp with time zone NOT NULL,
  description text NOT NULL,
  file_url text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT finance_pkey PRIMARY KEY (id),
  CONSTRAINT finance_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.projects (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'active'::text,
  client_id uuid,
  owner_id uuid,
  start_date date,
  end_date date,
  budget numeric,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT projects_pkey PRIMARY KEY (id),
  CONSTRAINT projects_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.users(id),
  CONSTRAINT projects_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id),
  CONSTRAINT projects_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id)
);
CREATE TABLE public.prospect_projects (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT prospect_projects_pkey PRIMARY KEY (id),
  CONSTRAINT prospect_projects_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id)
);
CREATE TYPE prospect_status AS ENUM ('contacted', 'follow-up', 'closed');

CREATE TABLE public.prospects (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  project_id uuid,
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  status prospect_status NOT NULL DEFAULT 'contacted',
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT prospects_pkey PRIMARY KEY (id),
  CONSTRAINT prospects_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.prospect_projects(id)
);
CREATE TABLE public.tasks (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  project_id uuid,
  title text NOT NULL,
  status text,
  description text,
  assignee_id uuid,
  due_date date,
  created_at timestamp with time zone DEFAULT now(),
  created_by uuid,
  CONSTRAINT tasks_pkey PRIMARY KEY (id),
  CONSTRAINT tasks_assignee_id_fkey FOREIGN KEY (assignee_id) REFERENCES public.users(id)
);
CREATE TABLE public.users (
  id uuid NOT NULL,
  email text,
  full_name text,
  role user_role NOT NULL DEFAULT 'user',
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT users_pkey PRIMARY KEY (id),
  CONSTRAINT users_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);