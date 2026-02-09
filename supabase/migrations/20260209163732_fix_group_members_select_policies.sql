-- ============================================================================
-- Fix group_members SELECT policies (prevent infinite recursion)
-- ============================================================================

-- Create a helper function that bypasses RLS to get user's group IDs
CREATE OR REPLACE FUNCTION get_user_group_ids(user_id UUID)
RETURNS TABLE(group_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT gm.group_id
  FROM group_members gm
  WHERE gm.user_id = get_user_group_ids.user_id;
END;
$$;

-- Drop ALL existing SELECT policies on group_members
DROP POLICY IF EXISTS "Users can view group members" ON group_members;
DROP POLICY IF EXISTS "Users can view members in their groups" ON group_members;
DROP POLICY IF EXISTS "Members can view group members" ON group_members;
DROP POLICY IF EXISTS "Users can see own memberships" ON group_members;
DROP POLICY IF EXISTS "System admins can see all memberships" ON group_members;
DROP POLICY IF EXISTS "Users can see members in their groups" ON group_members;

-- Policy 1: Users can see their own membership records
CREATE POLICY "Users can see own memberships"
  ON group_members
  FOR SELECT
  USING (user_id = auth.uid());

-- Policy 2: System admins can see all memberships
CREATE POLICY "System admins can see all memberships"
  ON group_members
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM system_roles
      WHERE system_roles.user_id = auth.uid()
      AND system_roles.role = 'system_admin'
    )
  );

-- Policy 3: Users can see members of their groups (using SECURITY DEFINER function)
CREATE POLICY "Users can see members in their groups"
  ON group_members
  FOR SELECT
  USING (
    group_id IN (
      SELECT * FROM get_user_group_ids(auth.uid())
    )
  );

-- Comments
COMMENT ON FUNCTION get_user_group_ids(UUID) IS
'Helper function that returns all group IDs a user belongs to. Uses SECURITY DEFINER to bypass RLS and prevent infinite recursion.';

COMMENT ON POLICY "Users can see own memberships" ON group_members IS
'Allows users to view their own membership records in any group.';

COMMENT ON POLICY "System admins can see all memberships" ON group_members IS
'Allows system administrators to view all group memberships.';

COMMENT ON POLICY "Users can see members in their groups" ON group_members IS
'Allows users to view all members of groups they belong to. Uses SECURITY DEFINER function to prevent infinite recursion.';
