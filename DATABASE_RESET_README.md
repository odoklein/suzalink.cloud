# Database Reset Guide

This guide will help you completely reset your database and recreate all tables from scratch.

## ⚠️ WARNING
This process will **DELETE ALL DATA** in your database. Make sure to backup any important data before proceeding.

## Option 1: Manual Reset (Recommended)

### Step 1: Access Supabase Dashboard
1. Go to your [Supabase Dashboard](https://app.supabase.com/)
2. Select your project
3. Go to **SQL Editor**

### Step 2: Run the Reset Script
1. Copy the contents of `database_reset_manual.sql`
2. Paste it into the SQL Editor
3. Click **Run**

### Step 3: Verify
After running the script, you should see all tables recreated successfully.

### Step 4: Check Users Table
After running the reset, verify your users were synced:

```sql
SELECT COUNT(*) as users_count FROM public.users;
SELECT id, full_name, email, role FROM public.users ORDER BY created_at DESC LIMIT 5;
```

## 🚨 IF YOU ALREADY DROPPED THE USERS TABLE

If you accidentally dropped the `public.users` table, run this script first:

```sql
-- Copy from recreate_users_table.sql
-- This will recreate the users table and sync all auth.users data
```

## Option 2: Automated Reset (Advanced)

### Prerequisites
Make sure you have Node.js installed and your environment variables set:

```bash
# Set your environment variables
export NEXT_PUBLIC_SUPABASE_URL="your_supabase_url"
export SUPABASE_SERVICE_ROLE_KEY="your_service_role_key"
```

### Run the Script
```bash
node run_database_reset.js
```

## What Gets Recreated

### Core Tables
- **`users`** - User accounts and profiles (CRITICAL - automatically synced from auth.users)
- `prospect_lists` - Lists for organizing prospects
- `prospects` - Main prospects table with JSONB data structure
- `prospect_interlocuteurs` - Contact persons for prospects
- `prospect_activities` - Activity log for prospects
- `prospect_assignments` - User assignments for prospects

### Communication Tables
- `conversations` - Chat conversations
- `messages` - Individual messages
- `message_participants` - Conversation participants

### Email System Tables
- `user_email_configs` - Email account configurations
- `email_folders` - Email folders
- `personal_emails` - Personal email storage
- `email_templates` - Email templates
- And more email-related tables...

### Other Tables
- `notifications` - User notifications

## Key Features of the New Schema

### ✅ Removed RLS
As requested, Row Level Security has been removed from all tables.

### ✅ JSONB Data Structure
The `prospects` table uses a `data` JSONB column to store prospect information (name, email, phone, etc.) as requested.

### ✅ Comprehensive Indexes
All necessary indexes are created for optimal performance.

### ✅ Automatic Triggers
- `updated_at` timestamps are automatically maintained
- Prospect counts are automatically updated
- Phone number detection works automatically

## After Reset

### 1. Create Initial User
You'll need to create at least one user in the `users` table:

```sql
INSERT INTO public.users (id, name, email, role)
VALUES ('your-user-id', 'Your Name', 'your@email.com', 'admin');
```

### 2. Test the Application
Your prospects system should now work with the clean database schema.

### 3. Import Data (Optional)
If you have data to import, you can now use the CSV import functionality in the application.

## Troubleshooting

### If the script fails:
1. Check for any foreign key constraint errors
2. Some tables might already be dropped, so you can comment out those DROP statements
3. Run smaller chunks of the script if needed

### If you see authentication errors:
Make sure your Supabase credentials are correct and you have the necessary permissions.

## Files Created

- `supabase/migrations/000_drop_all_tables.sql` - Drops all existing tables
- `supabase/migrations/001_recreate_all_tables.sql` - Recreates all tables
- `database_reset_manual.sql` - Complete manual reset script
- `run_database_reset.js` - Automated reset script
- `DATABASE_RESET_README.md` - This documentation

## Need Help?

If you encounter any issues during the reset process, check the console logs for error messages and refer to the Supabase documentation for troubleshooting.
