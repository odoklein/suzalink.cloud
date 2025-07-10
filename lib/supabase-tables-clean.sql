-- Drop existing policies first
drop policy if exists "Allow authenticated users to read prospects" on prospects;
drop policy if exists "Allow authenticated users to insert prospects" on prospects;
drop policy if exists "Allow authenticated users to update prospects" on prospects;
drop policy if exists "Allow authenticated users to delete prospects" on prospects;
drop policy if exists "Users can view own profile" on users;
drop policy if exists "Users can update own profile" on users;
drop policy if exists "Users can insert own profile" on users;

-- Drop existing tables (this will also drop dependent objects)
drop table if exists prospects cascade;
drop table if exists clients cascade;
drop table if exists projects cascade;
drop table if exists tasks cascade;
drop table if exists entries cascade;
drop table if exists messages cascade;
drop table if exists users cascade;

-- Create new tables with the updated structure

-- Users Table (extends Supabase auth.users)
create table if not exists public.users (
  id uuid references auth.users on delete cascade primary key,
  email text,
  full_name text,
  created_at timestamp with time zone default now()
);

-- Prospect Projects Table
create table if not exists prospect_projects (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamp with time zone default now()
);

-- Prospects Table (linked to prospect_projects)
create table if not exists prospects (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references prospect_projects(id) on delete cascade,
  name text not null,
  email text not null,
  phone text,
  status text,
  created_at timestamp with time zone default now()
);

-- Clients Table
create table if not exists clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact_email text not null,
  company text,
  created_at timestamp with time zone default now()
);

-- Projects Table
create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  status text
);

-- Tasks Table
create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  title text not null,
  status text
);

-- Entries Table (for finance)
create table if not exists entries (
  id uuid primary key default gen_random_uuid(),
  type text check (type in ('income', 'expense')),
  amount numeric not null,
  description text,
  date date not null
);

-- Messages Table (for chat)
create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null,
  receiver_id uuid not null,
  content text not null,
  timestamp timestamp with time zone default now()
);

-- Enable RLS
alter table prospects enable row level security;
alter table clients enable row level security;
alter table projects enable row level security;
alter table tasks enable row level security;
alter table entries enable row level security;
alter table messages enable row level security;
alter table users enable row level security;
alter table prospect_projects enable row level security;

-- Create policies for prospects (allow all authenticated users to read/write)
create policy "Allow authenticated users to read prospects" on prospects
  for select using (auth.role() = 'authenticated');

create policy "Allow authenticated users to insert prospects" on prospects
  for insert with check (auth.role() = 'authenticated');

create policy "Allow authenticated users to update prospects" on prospects
  for update using (auth.role() = 'authenticated');

create policy "Allow authenticated users to delete prospects" on prospects
  for delete using (auth.role() = 'authenticated');

-- Create policies for prospect_projects
create policy "Allow authenticated users to read prospect_projects" on prospect_projects
  for select using (auth.role() = 'authenticated');

create policy "Allow authenticated users to insert prospect_projects" on prospect_projects
  for insert with check (auth.role() = 'authenticated');

create policy "Allow authenticated users to update prospect_projects" on prospect_projects
  for update using (auth.role() = 'authenticated');

create policy "Allow authenticated users to delete prospect_projects" on prospect_projects
  for delete using (auth.role() = 'authenticated');

-- Create policies for users table
create policy "Users can view own profile" on users
  for select using (auth.uid() = id);

create policy "Users can update own profile" on users
  for update using (auth.uid() = id);

create policy "Users can insert own profile" on users
  for insert with check (auth.uid() = id);

-- Insert mock data for prospect_projects
insert into prospect_projects (title, description) values
  ('Q1 Marketing Campaign', 'Lead generation campaign for Q1'),
  ('Website Redesign Leads', 'Prospects interested in website redesign'),
  ('Mobile App Development', 'Potential clients for mobile app projects');

-- Insert mock data for prospects
insert into prospects (project_id, name, email, phone, status) 
select 
  pp.id,
  p.name,
  p.email,
  p.phone,
  p.status
from (
  values 
    ('John Smith', 'john.smith@email.com', '+1-555-0101', 'New'),
    ('Sarah Johnson', 'sarah.j@company.com', '+1-555-0102', 'Contacted'),
    ('Mike Wilson', 'mike.wilson@startup.io', '+1-555-0103', 'Qualified'),
    ('Emily Davis', 'emily.davis@corp.com', '+1-555-0104', 'Proposal'),
    ('David Brown', 'david.brown@tech.com', '+1-555-0105', 'Negotiation')
) as p(name, email, phone, status)
cross join (select id from prospect_projects limit 1) as pp;

-- Insert mock data for clients
insert into clients (name, contact_email, company) values
  ('Acme Corporation', 'contact@acme.com', 'Acme Corp'),
  ('TechStart Inc', 'hello@techstart.io', 'TechStart Inc'),
  ('Global Solutions', 'info@globalsolutions.com', 'Global Solutions Ltd'),
  ('Innovation Labs', 'team@innovationlabs.com', 'Innovation Labs');

-- Insert mock data for projects
insert into projects (title, description, status) values
  ('Website Redesign', 'Complete redesign of company website', 'Active'),
  ('Mobile App Development', 'iOS and Android app for client', 'Planning'),
  ('E-commerce Platform', 'Online store with payment integration', 'Completed'),
  ('Marketing Campaign', 'Digital marketing campaign for Q4', 'Active');

-- Insert mock data for entries (finance)
insert into entries (type, amount, description, date) values
  ('income', 5000.00, 'Website design project', '2024-01-15'),
  ('income', 3000.00, 'Consulting services', '2024-01-20'),
  ('expense', 500.00, 'Software licenses', '2024-01-10'),
  ('expense', 200.00, 'Office supplies', '2024-01-25'),
  ('income', 7500.00, 'Mobile app development', '2024-02-01'); 