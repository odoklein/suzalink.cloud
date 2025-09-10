# Email System Database Schema

This directory contains the complete database schema for a comprehensive email management system that supports both personal email and email campaigns.

## 📁 Files Overview

- **`email_system_schema.sql`** - Complete database schema with all tables, indexes, triggers, and RLS policies
- **`setup_email_system.sql`** - Setup script that includes the schema and verification queries
- **`EMAIL_SYSTEM_README.md`** - This documentation file

## 🗄️ Database Schema Structure

### Core Tables (13 Total)

#### Personal Email Management
1. **`user_email_configs`** - SMTP/IMAP configuration for each user's email accounts
2. **`email_folders`** - Email folders (Inbox, Sent, Drafts, etc.) per account
3. **`personal_emails`** - Individual email messages storage
4. **`email_attachments`** - File attachments for emails
5. **`email_labels`** - Custom labels/tags for organizing emails
6. **`email_label_assignments`** - Many-to-many relationship between emails and labels

#### Email Templates & Signatures
7. **`email_templates`** - Reusable email templates for campaigns and quick replies
8. **`email_signatures`** - User signatures that can be appended to emails

#### Email Campaigns
9. **`email_campaigns`** - Campaign definitions and tracking
10. **`campaign_recipients`** - Recipients for each campaign (linked to prospects)
11. **`email_sends`** - Individual send tracking for campaign emails
12. **`email_tracking_events`** - Open/click tracking events
13. **`campaign_analytics`** - Daily aggregated analytics
14. **`email_unsubscribes`** - Global unsubscribe list

## 🚀 Quick Setup

### Option 1: Using Supabase CLI (Recommended)

```bash
# Apply the schema to your Supabase project
supabase db push

# Or if using migrations
supabase migration new create_email_system
# Copy the contents of email_system_schema.sql into the migration file
supabase db push
```

### Option 2: Direct Database Connection

```bash
# Connect to your PostgreSQL database
psql -h your-host -U your-user -d your-database -f email_system_schema.sql
```

### Option 3: Using the Setup Script

```bash
# Run the complete setup script
psql -h your-host -U your-user -d your-database -f setup_email_system.sql
```

## 🔧 Configuration Requirements

### Environment Variables

Make sure these environment variables are set in your application:

```env
# Encryption key for email passwords (generate a secure random string)
ENCRYPTION_KEY=your-secure-random-key-here

# Supabase configuration
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Supabase Storage Bucket

Create a storage bucket for email attachments:

```sql
-- Create the email-attachments bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('email-attachments', 'email-attachments', false);

-- Set up RLS policies for the bucket
CREATE POLICY "Users can upload their own attachments"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'email-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own attachments"
ON storage.objects FOR SELECT
USING (bucket_id = 'email-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);
```

## 📋 Key Features

### Personal Email Management
- ✅ Multiple email account support (IMAP/SMTP)
- ✅ Full email synchronization
- ✅ Attachment handling
- ✅ Email labeling and organization
- ✅ Draft management
- ✅ Email search and filtering

### Email Campaigns
- ✅ Template-based campaigns
- ✅ Prospect integration
- ✅ Advanced tracking (opens, clicks, bounces)
- ✅ A/B testing capabilities
- ✅ Scheduled sending
- ✅ Unsubscribe management

### Security & Performance
- ✅ Row Level Security (RLS) on all tables
- ✅ Encrypted email passwords
- ✅ Comprehensive indexing
- ✅ Database triggers for automatic updates
- ✅ Foreign key constraints

## 🔗 API Integration

The schema is designed to work with the existing API routes:

- **`/api/emails/config`** - Email account management
- **`/api/emails/send`** - Email sending with SMTP
- **`/api/emails/messages`** - Email retrieval and management
- **`/api/emails/templates`** - Template management
- **`/api/emails/signatures`** - Signature management
- **`/api/emails/folders`** - Folder management
- **`/api/emails/sync/[configId]`** - Email synchronization

## 📊 Database Relationships

```
users (auth.users)
├── user_email_configs
│   ├── email_folders
│   │   └── personal_emails
│   │       ├── email_attachments
│   │       └── email_label_assignments
│   │           └── email_labels
│   └── email_campaigns
│       ├── campaign_recipients (→ prospects)
│       │   └── email_sends
│       │       └── email_tracking_events
│       ├── campaign_analytics
│       └── email_unsubscribes
├── email_templates
└── email_signatures
```

## 🔍 Verification Queries

After setup, verify the installation:

```sql
-- Check tables
SELECT tablename FROM pg_tables
WHERE schemaname = 'public' AND tablename LIKE '%email%'
ORDER BY tablename;

-- Check indexes
SELECT indexname FROM pg_indexes
WHERE schemaname = 'public' AND tablename LIKE '%email%'
ORDER BY indexname;

-- Check triggers
SELECT trigger_name FROM information_schema.triggers
WHERE event_object_schema = 'public' AND event_object_table LIKE '%email%'
ORDER BY trigger_name;
```

## 🛠️ Maintenance

### Regular Tasks
- Monitor email sync performance
- Clean up old email tracking events (optional)
- Update campaign analytics daily
- Backup email configurations and templates

### Optimization
- The schema includes comprehensive indexing
- Consider partitioning large tables if email volume is high
- Monitor query performance and add indexes as needed

## 📞 Support

If you encounter issues:
1. Check the verification queries to ensure proper installation
2. Verify environment variables are set correctly
3. Check Supabase logs for any errors
4. Ensure proper permissions for email accounts

## 🔄 Migration Notes

- All tables use `IF NOT EXISTS` to prevent conflicts
- Indexes are created with `IF NOT EXISTS`
- Functions use `CREATE OR REPLACE`
- RLS policies are additive (won't overwrite existing policies)

This schema provides a production-ready foundation for a comprehensive email management system integrated with your prospect management platform.
