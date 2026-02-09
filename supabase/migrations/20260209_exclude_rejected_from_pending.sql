-- ============================================================================
-- Update get_pending_groups to exclude rejected groups
-- ============================================================================

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
    COALESCE(u.email::TEXT, 'Unknown') as creator_email,
    COUNT(DISTINCT gm.user_id)::BIGINT as admin_count
  FROM groups g
  LEFT JOIN auth.users u ON g.creator_id = u.id
  LEFT JOIN group_members gm ON g.id = gm.group_id AND gm.role = 'admin'
  WHERE g.approved = FALSE
    AND g.rejected_at IS NULL  -- Exclude rejected groups
  GROUP BY g.id, g.name, g.code, g.description, g.created_at, u.email
  ORDER BY g.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_pending_groups IS
'Returns groups pending approval, excluding rejected groups.';
