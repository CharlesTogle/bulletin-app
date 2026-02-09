-- ============================================================================
-- SYSTEM ADMIN ROLE
-- ============================================================================
-- System-wide administrators who can:
-- 1. Create and manage groups
-- 2. View system statistics
-- 3. Manage system-level settings
-- ============================================================================

-- Create system_roles table
CREATE TABLE IF NOT EXISTS system_roles (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  role TEXT NOT NULL CHECK (role IN ('system_admin')),
  granted_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  granted_by UUID REFERENCES auth.users(id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_system_roles_role ON system_roles(role);

-- ============================================================================
-- RLS POLICIES - System Roles
-- ============================================================================

ALTER TABLE system_roles ENABLE ROW LEVEL SECURITY;

-- System admins can view all system roles
DROP POLICY IF EXISTS "System admins can view all system roles" ON system_roles;
CREATE POLICY "System admins can view all system roles" ON system_roles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM system_roles sr
      WHERE sr.user_id = auth.uid()
      AND sr.role = 'system_admin'
    )
  );

-- Only system admins can grant system admin roles
DROP POLICY IF EXISTS "System admins can grant roles" ON system_roles;
CREATE POLICY "System admins can grant roles" ON system_roles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM system_roles sr
      WHERE sr.user_id = auth.uid()
      AND sr.role = 'system_admin'
    )
  );

-- System admins can revoke roles
DROP POLICY IF EXISTS "System admins can revoke roles" ON system_roles;
CREATE POLICY "System admins can revoke roles" ON system_roles
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM system_roles sr
      WHERE sr.user_id = auth.uid()
      AND sr.role = 'system_admin'
    )
  );

-- ============================================================================
-- STATISTICS VIEWS
-- ============================================================================

-- System overview statistics
CREATE OR REPLACE VIEW system_statistics AS
SELECT
  (SELECT COUNT(*) FROM groups) as total_groups,
  (SELECT COUNT(*) FROM announcements) as total_announcements,
  (SELECT COUNT(*) FROM group_members) as total_memberships,
  (SELECT COUNT(DISTINCT user_id) FROM group_members) as total_active_users,
  (SELECT COUNT(*) FROM votes) as total_votes,
  (SELECT COUNT(*) FROM attachments) as total_attachments;

-- Groups created over time (for graphs)
CREATE OR REPLACE VIEW groups_created_timeline AS
SELECT
  DATE_TRUNC('day', created_at) as date,
  COUNT(*) as groups_created
FROM groups
GROUP BY DATE_TRUNC('day', created_at)
ORDER BY date DESC;

-- Announcements created over time (for graphs)
CREATE OR REPLACE VIEW announcements_created_timeline AS
SELECT
  DATE_TRUNC('day', created_at) as date,
  COUNT(*) as announcements_created
FROM announcements
GROUP BY DATE_TRUNC('day', created_at)
ORDER BY date DESC;

-- Group activity statistics
CREATE OR REPLACE VIEW group_activity_stats AS
SELECT
  g.id,
  g.name,
  g.code,
  g.created_at,
  COUNT(DISTINCT gm.user_id) as member_count,
  COUNT(DISTINCT a.id) as announcement_count,
  COUNT(DISTINCT v.id) as total_votes,
  MAX(a.created_at) as last_announcement_at
FROM groups g
LEFT JOIN group_members gm ON g.id = gm.group_id
LEFT JOIN announcements a ON g.id = a.group_id
LEFT JOIN votes v ON a.id = v.announcement_id
GROUP BY g.id, g.name, g.code, g.created_at
ORDER BY g.created_at DESC;

-- Top active groups by announcements
CREATE OR REPLACE VIEW top_active_groups AS
SELECT
  g.id,
  g.name,
  g.code,
  COUNT(DISTINCT a.id) as announcement_count,
  COUNT(DISTINCT gm.user_id) as member_count,
  COUNT(DISTINCT v.id) as vote_count
FROM groups g
LEFT JOIN announcements a ON g.id = a.group_id
LEFT JOIN group_members gm ON g.id = gm.group_id
LEFT JOIN votes v ON a.id = v.announcement_id
GROUP BY g.id, g.name, g.code
ORDER BY announcement_count DESC, vote_count DESC
LIMIT 20;

-- User activity statistics
CREATE OR REPLACE VIEW user_activity_stats AS
SELECT
  u.id,
  u.email,
  COUNT(DISTINCT gm.group_id) as groups_joined,
  COUNT(DISTINCT a.id) as announcements_created,
  COUNT(DISTINCT v.id) as votes_cast,
  MAX(a.created_at) as last_announcement_at,
  MAX(v.created_at) as last_vote_at
FROM auth.users u
LEFT JOIN group_members gm ON u.id = gm.user_id
LEFT JOIN announcements a ON u.id = a.author_id
LEFT JOIN votes v ON u.id = v.user_id
GROUP BY u.id, u.email
ORDER BY announcements_created DESC, votes_cast DESC;

-- ============================================================================
-- RLS POLICIES - Statistics Views
-- ============================================================================

-- Only system admins can view statistics
ALTER VIEW system_statistics SET (security_invoker = on);
ALTER VIEW groups_created_timeline SET (security_invoker = on);
ALTER VIEW announcements_created_timeline SET (security_invoker = on);
ALTER VIEW group_activity_stats SET (security_invoker = on);
ALTER VIEW top_active_groups SET (security_invoker = on);
ALTER VIEW user_activity_stats SET (security_invoker = on);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Check if user is system admin
CREATE OR REPLACE FUNCTION is_system_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM system_roles
    WHERE system_roles.user_id = is_system_admin.user_id
    AND role = 'system_admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if current user is system admin
-- Usage in policies: is_current_user_system_admin()
CREATE OR REPLACE FUNCTION is_current_user_system_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN is_system_admin(auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE system_roles IS 'System-wide administrative roles for platform management';
COMMENT ON VIEW system_statistics IS 'Overall platform statistics for system admin dashboard';
COMMENT ON VIEW groups_created_timeline IS 'Time-series data for groups created over time';
COMMENT ON VIEW announcements_created_timeline IS 'Time-series data for announcements created over time';
COMMENT ON VIEW group_activity_stats IS 'Detailed activity statistics per group';
COMMENT ON VIEW top_active_groups IS 'Top 20 most active groups by announcements and votes';
COMMENT ON VIEW user_activity_stats IS 'User engagement statistics across the platform';
