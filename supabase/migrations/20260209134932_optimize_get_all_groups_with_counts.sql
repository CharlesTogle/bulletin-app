-- ============================================================================
-- OPTIMIZE: Create efficient function to get all groups with counts
-- ============================================================================
-- This function replaces the N+1 query problem where we were making
-- 2 queries per group (member count + announcement count)
-- Now we fetch everything in a single efficient query with LEFT JOINs

CREATE OR REPLACE FUNCTION get_all_groups_with_counts()
RETURNS TABLE (
  id UUID,
  creator_id UUID,
  name TEXT,
  code TEXT,
  description TEXT,
  approved BOOLEAN,
  approved_at TIMESTAMPTZ,
  approved_by UUID,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  member_count BIGINT,
  admin_count BIGINT,
  announcement_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    g.id,
    g.creator_id,
    g.name,
    g.code,
    g.description,
    g.approved,
    g.approved_at,
    g.approved_by,
    g.created_at,
    g.updated_at,
    COALESCE(COUNT(DISTINCT gm.id), 0)::BIGINT AS member_count,
    COALESCE(COUNT(DISTINCT gm.id) FILTER (WHERE gm.role = 'admin'), 0)::BIGINT AS admin_count,
    COALESCE(COUNT(DISTINCT a.id), 0)::BIGINT AS announcement_count
  FROM groups g
  LEFT JOIN group_members gm ON gm.group_id = g.id
  LEFT JOIN announcements a ON a.group_id = g.id
  GROUP BY g.id, g.creator_id, g.name, g.code, g.description, g.approved,
           g.approved_at, g.approved_by, g.created_at, g.updated_at
  ORDER BY g.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_all_groups_with_counts() TO authenticated;

-- Add comment explaining the function
COMMENT ON FUNCTION get_all_groups_with_counts() IS
'Efficiently fetches all groups with member and announcement counts in a single query. Used by system admins to avoid N+1 query problem.';
