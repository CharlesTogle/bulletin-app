-- ============================================================================
-- FIX: Type mismatch in get_pending_groups function
-- ============================================================================
-- The email field from auth.users is VARCHAR but we declared it as TEXT
-- Cast to TEXT to match the return type

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
    COALESCE(u.email::TEXT, 'Unknown') as creator_email,  -- Cast to TEXT
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
