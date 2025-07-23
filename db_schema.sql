-- Prospection Folders
create table if not exists prospect_folders (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid references users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Prospection Lists
create table if not exists prospection_lists (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  folder_id uuid references prospect_folders(id),
  columns jsonb not null default '[]', -- Array of { key, label, type }
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Prospects (rows, dynamic columns)
create table if not exists prospects (
  id uuid primary key default gen_random_uuid(),
  list_id uuid references prospection_lists(id),
  data jsonb not null, -- Arbitrary key/value pairs for columns
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
