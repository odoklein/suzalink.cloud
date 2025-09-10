-- =====================================================
-- DROP ALL TABLES - CLEAN SLATE MIGRATION
-- =====================================================

-- Drop all tables in reverse dependency order to avoid foreign key constraint issues

-- Drop email campaign tables first (they reference prospects)
DROP TABLE IF EXISTS public.campaign_analytics CASCADE;
DROP TABLE IF EXISTS public.email_tracking_events CASCADE;
DROP TABLE IF EXISTS public.email_sends CASCADE;
DROP TABLE IF EXISTS public.campaign_recipients CASCADE;
DROP TABLE IF EXISTS public.email_campaigns CASCADE;
DROP TABLE IF EXISTS public.email_unsubscribes CASCADE;

-- Drop email personal tables
DROP TABLE IF EXISTS public.email_label_assignments CASCADE;
DROP TABLE IF EXISTS public.email_labels CASCADE;
DROP TABLE IF EXISTS public.email_attachments CASCADE;
DROP TABLE IF EXISTS public.personal_emails CASCADE;
DROP TABLE IF EXISTS public.email_folders CASCADE;
DROP TABLE IF EXISTS public.user_email_configs CASCADE;
DROP TABLE IF EXISTS public.email_templates CASCADE;

-- Drop prospect-related tables
DROP TABLE IF EXISTS public.prospect_assignments CASCADE;
DROP TABLE IF EXISTS public.prospect_activities CASCADE;
DROP TABLE IF EXISTS public.prospect_interlocuteurs CASCADE;
DROP TABLE IF EXISTS public.prospects CASCADE;
DROP TABLE IF EXISTS public.prospect_lists CASCADE;

-- Drop notification tables
DROP TABLE IF EXISTS public.notifications CASCADE;

-- Drop messagerie tables
DROP TABLE IF EXISTS public.messages CASCADE;
DROP TABLE IF EXISTS public.conversations CASCADE;
DROP TABLE IF EXISTS public.message_participants CASCADE;

-- Keep users table - DO NOT DROP (application depends on it)
-- DROP TABLE IF EXISTS public.users CASCADE;

-- Drop any other tables that might exist
DROP TABLE IF EXISTS public.user_profiles CASCADE;
DROP TABLE IF EXISTS public.user_settings CASCADE;
DROP TABLE IF EXISTS public.organizations CASCADE;
DROP TABLE IF EXISTS public.user_organizations CASCADE;

-- Drop any functions and triggers that might cause issues
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS update_prospect_interlocuteurs_updated_at() CASCADE;
DROP FUNCTION IF EXISTS update_prospect_count() CASCADE;
DROP FUNCTION IF EXISTS update_prospect_list_count() CASCADE;
DROP FUNCTION IF EXISTS update_prospects_updated_at() CASCADE;
DROP FUNCTION IF EXISTS update_campaign_stats(uuid) CASCADE;
DROP FUNCTION IF EXISTS generate_tracking_id() CASCADE;
DROP FUNCTION IF EXISTS cleanup_expired_notifications() CASCADE;
DROP FUNCTION IF EXISTS detect_phone_numbers() CASCADE;

-- Drop any custom types if they exist
DROP TYPE IF EXISTS public.prospect_status CASCADE;
DROP TYPE IF EXISTS public.campaign_status CASCADE;
DROP TYPE IF EXISTS public.email_send_status CASCADE;
