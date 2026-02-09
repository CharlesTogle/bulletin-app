-- ============================================================================
-- DROP EVERYTHING - CLEAN SLATE
-- ============================================================================
-- WARNING: This will delete ALL data and schema objects!
-- Use this to reset the database to a clean state before running migrations
-- ============================================================================

-- Drop all views (must drop before tables due to dependencies)
DROP VIEW IF EXISTS pending_groups CASCADE;
DROP VIEW IF EXISTS user_activity_stats CASCADE;
DROP VIEW IF EXISTS top_active_groups CASCADE;
DROP VIEW IF EXISTS group_activity_stats CASCADE;
DROP VIEW IF EXISTS announcements_created_timeline CASCADE;
DROP VIEW IF EXISTS groups_created_timeline CASCADE;
DROP VIEW IF EXISTS system_statistics CASCADE;
DROP VIEW IF EXISTS groups_with_stats CASCADE;

-- Drop all tables (will cascade delete triggers, policies, etc.)
DROP TABLE IF EXISTS attachments CASCADE;
DROP TABLE IF EXISTS votes CASCADE;
DROP TABLE IF EXISTS announcement_tags CASCADE;
DROP TABLE IF EXISTS announcements CASCADE;
DROP TABLE IF EXISTS tags CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS group_members CASCADE;
DROP TABLE IF EXISTS groups CASCADE;
DROP TABLE IF EXISTS system_roles CASCADE;

-- Drop all functions
DROP FUNCTION IF EXISTS is_current_user_system_admin() CASCADE;
DROP FUNCTION IF EXISTS is_system_admin(UUID) CASCADE;
DROP FUNCTION IF EXISTS update_announcement_vote_counts() CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS add_creator_as_admin() CASCADE;
DROP FUNCTION IF EXISTS generate_group_code(INTEGER) CASCADE;

-- Drop storage bucket (if needed)
-- Note: Run this in Supabase Dashboard Storage section manually
-- DELETE FROM storage.buckets WHERE id = 'attachments';

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- Run these to verify everything is dropped:

-- Check remaining tables
-- SELECT tablename FROM pg_tables WHERE schemaname = 'public';

-- Check remaining views
-- SELECT viewname FROM pg_views WHERE schemaname = 'public';

-- Check remaining functions
-- SELECT proname FROM pg_proc WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
