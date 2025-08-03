-- Migration: Add email system tables
-- This migration creates the email storage system for the CRM

-- Create email_folders table
CREATE TABLE IF NOT EXISTS email_folders (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL, -- "INBOX", "Sent", "Drafts", "Trash"
  display_name VARCHAR(255) NOT NULL, -- "Boîte de réception", "Envoyés"
  imap_path VARCHAR(255) NOT NULL, -- "INBOX", "INBOX.Sent"
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, name)
);

-- Create emails table
CREATE TABLE IF NOT EXISTS emails (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  folder_id INTEGER REFERENCES email_folders(id) ON DELETE CASCADE,
  message_id VARCHAR(500) NOT NULL, -- IMAP Message-ID
  imap_uid BIGINT NOT NULL, -- IMAP UID for sync
  from_address TEXT NOT NULL,
  from_name VARCHAR(255),
  to_address TEXT,
  cc_address TEXT,
  bcc_address TEXT,
  subject TEXT,
  text_content TEXT,
  html_content TEXT,
  raw_content TEXT, -- Full MIME message
  date_received TIMESTAMP NOT NULL,
  size_bytes INTEGER,
  flags TEXT[], -- ['\\Seen', '\\Flagged', '\\Deleted']
  is_read BOOLEAN DEFAULT FALSE,
  is_starred BOOLEAN DEFAULT FALSE,
  is_deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, folder_id, imap_uid)
);

-- Create email_attachments table
CREATE TABLE IF NOT EXISTS email_attachments (
  id SERIAL PRIMARY KEY,
  email_id INTEGER REFERENCES emails(id) ON DELETE CASCADE,
  filename VARCHAR(255) NOT NULL,
  content_type VARCHAR(100),
  size_bytes INTEGER,
  content_id VARCHAR(255), -- For inline attachments
  is_inline BOOLEAN DEFAULT FALSE,
  storage_path VARCHAR(500), -- Path in Supabase Storage
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_emails_user_folder ON emails(user_id, folder_id);
CREATE INDEX IF NOT EXISTS idx_emails_date ON emails(date_received DESC);
CREATE INDEX IF NOT EXISTS idx_emails_message_id ON emails(message_id);
CREATE INDEX IF NOT EXISTS idx_emails_imap_uid ON emails(user_id, folder_id, imap_uid);
CREATE INDEX IF NOT EXISTS idx_emails_unread ON emails(user_id, folder_id) 
WHERE is_read = false AND is_deleted = false;

-- Create RLS policies
ALTER TABLE email_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_attachments ENABLE ROW LEVEL SECURITY;

-- Email folders policies
CREATE POLICY "Users can view their own email folders" ON email_folders
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own email folders" ON email_folders
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own email folders" ON email_folders
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own email folders" ON email_folders
  FOR DELETE USING (auth.uid() = user_id);

-- Emails policies
CREATE POLICY "Users can view their own emails" ON emails
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own emails" ON emails
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own emails" ON emails
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own emails" ON emails
  FOR DELETE USING (auth.uid() = user_id);

-- Email attachments policies
CREATE POLICY "Users can view their own email attachments" ON email_attachments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM emails 
      WHERE emails.id = email_attachments.email_id 
      AND emails.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own email attachments" ON email_attachments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM emails 
      WHERE emails.id = email_attachments.email_id 
      AND emails.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own email attachments" ON email_attachments
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM emails 
      WHERE emails.id = email_attachments.email_id 
      AND emails.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own email attachments" ON email_attachments
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM emails 
      WHERE emails.id = email_attachments.email_id 
      AND emails.user_id = auth.uid()
    )
  );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_email_folders_updated_at 
  BEFORE UPDATE ON email_folders 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_emails_updated_at 
  BEFORE UPDATE ON emails 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column(); 