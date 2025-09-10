-- =====================================================
-- EMAIL SYSTEM SETUP SCRIPT
-- Run this script to set up the complete email system
-- =====================================================

-- Include the main schema
\i email_system_schema.sql

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check if all tables were created
SELECT
    schemaname,
    tablename,
    tableowner
FROM pg_tables
WHERE schemaname = 'public'
    AND tablename LIKE 'email_%'
    OR tablename LIKE '%email%'
    OR tablename LIKE 'user_email%'
    OR tablename LIKE 'campaign%'
    OR tablename LIKE 'personal_emails'
ORDER BY tablename;

-- Check if indexes were created
SELECT
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
    AND (tablename LIKE 'email_%'
         OR tablename LIKE '%email%'
         OR tablename LIKE 'user_email%'
         OR tablename LIKE 'campaign%'
         OR tablename LIKE 'personal_emails')
ORDER BY tablename, indexname;

-- Check if triggers were created
SELECT
    event_object_schema,
    event_object_table,
    trigger_name,
    event_manipulation,
    action_timing
FROM information_schema.triggers
WHERE event_object_schema = 'public'
    AND (event_object_table LIKE 'email_%'
         OR event_object_table LIKE '%email%'
         OR event_object_table LIKE 'user_email%'
         OR event_object_table LIKE 'campaign%'
         OR event_object_table LIKE 'personal_emails')
ORDER BY event_object_table, trigger_name;

-- Check if functions were created
SELECT
    routine_schema,
    routine_name,
    routine_type,
    data_type
FROM information_schema.routines
WHERE routine_schema = 'public'
    AND (routine_name LIKE 'update_%'
         OR routine_name LIKE 'generate_%'
         OR routine_name LIKE 'ensure_%'
         OR routine_name LIKE '%campaign%')
ORDER BY routine_name;

-- =====================================================
-- SAMPLE DATA INSERTION (Optional)
-- =====================================================

-- Insert sample email configuration for testing
-- Note: Replace with actual values before running
/*
INSERT INTO public.user_email_configs (
    user_id,
    email_address,
    display_name,
    imap_host,
    imap_port,
    imap_secure,
    imap_username,
    imap_password_encrypted,
    smtp_host,
    smtp_port,
    smtp_secure,
    smtp_username,
    smtp_password_encrypted
) VALUES (
    'your-user-id-here',
    'your-email@example.com',
    'Your Name',
    'imap.example.com',
    993,
    true,
    'your-email@example.com',
    'encrypted-password-here',
    'smtp.example.com',
    587,
    false,
    'your-email@example.com',
    'encrypted-password-here'
);
*/

-- =====================================================
-- SETUP COMPLETE MESSAGE
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '=========================================';
    RAISE NOTICE 'EMAIL SYSTEM SETUP COMPLETE';
    RAISE NOTICE '=========================================';
    RAISE NOTICE 'The email system has been successfully set up with:';
    RAISE NOTICE '- 13 database tables';
    RAISE NOTICE '- Performance indexes';
    RAISE NOTICE '- Database triggers and functions';
    RAISE NOTICE '- Row Level Security policies';
    RAISE NOTICE '- Default email labels';
    RAISE NOTICE '';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Configure your email API endpoints';
    RAISE NOTICE '2. Set up encryption keys for email passwords';
    RAISE NOTICE '3. Configure Supabase storage for attachments';
    RAISE NOTICE '4. Test email sending functionality';
    RAISE NOTICE '=========================================';
END $$;
