-- Migration: Add email_read_status table for tracking read emails per user
create table if not exists email_read_status (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references users(id) on delete cascade,
    email_message_id text not null, -- IMAP message ID or generated ID
    mailbox text not null default 'INBOX',
    is_read boolean default false,
    read_at timestamp with time zone,
    created_at timestamp with time zone default timezone('utc', now())
);

create unique index if not exists idx_email_read_status_user_email on email_read_status(user_id, email_message_id, mailbox);
create index if not exists idx_email_read_status_user_id on email_read_status(user_id);
