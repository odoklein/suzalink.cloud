-- Migration: Add user_email_credentials table for storing IMAP/SMTP credentials per user
create table if not exists user_email_credentials (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references users(id) on delete cascade,
    imap_username text not null,
    imap_password text not null, -- should be encrypted in production
    smtp_username text not null,
    smtp_password text not null, -- should be encrypted in production
    created_at timestamp with time zone default timezone('utc', now()),
    updated_at timestamp with time zone default timezone('utc', now())
);

create unique index if not exists idx_user_email_credentials_user_id on user_email_credentials(user_id);
