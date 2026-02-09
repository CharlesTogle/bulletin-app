-- ============================================================================
-- FIX: Replace pending_groups view with SECURITY DEFINER function
-- ============================================================================
-- The view was failing because it tried to access auth.users which requires
-- special permissions. A SECURITY DEFINER function bypasses RLS and can
-- access auth.users safely.

-- Drop the old view
DROP VIEW IF EXISTS pending_groups CASCADE;

-- Create a SECURITY DEFINER function instead
CREATE OR REPLACE FUNCTION get_pending_groups()
RETURNS TABLE (
  id UUID,
  name TEXT,
  code TEXT,
  description TEXT,
  created_at TIMESTAMPTZ,
  creator_email TEXT,
  admin_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    g.id,
    g.name,
    g.code,
    g.description,
    g.created_at,
    COALESCE(u.email, 'Unknown') as creator_email,
    COUNT(DISTINCT gm.user_id)::BIGINT as admin_count
  FROM groups g
  LEFT JOIN auth.users u ON g.creator_id = u.id
  LEFT JOIN group_members gm ON g.id = gm.group_id AND gm.role = 'admin'
  WHERE g.approved = FALSE
  GROUP BY g.id, g.name, g.code, g.description, g.created_at, u.email
  ORDER BY g.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_pending_groups() TO authenticated;

-- Add comment
COMMENT ON FUNCTION get_pending_groups() IS
'Fetches groups awaiting system admin approval. Uses SECURITY DEFINER to access auth.users table safely.';
