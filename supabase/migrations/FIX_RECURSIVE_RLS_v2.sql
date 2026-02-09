-- ============================================================================
-- FIX: Remove Infinite Recursion in group_members RLS (v2)
-- ============================================================================

-- Create a helper function that bypasses RLS to get user's group IDs
CREATE OR REPLACE FUNCTION get_user_group_ids(user_id UUID)
RETURNS TABLE(group_id UUID) AS $$
BEGIN
  RETURN QUERY
  SELECT gm.group_id
  FROM group_members gm
  WHERE gm.user_id = get_user_group_ids.user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop ALL existing policies on group_members
DROP POLICY IF EXISTS "Users can view group members" ON group_members;
DROP POLICY IF EXISTS "Users can view members in their groups" ON group_members;
DROP POLICY IF EXISTS "Members can view group members" ON group_members;

-- Policy 1: Users can see their own membership records
CREATE POLICY "Users can see own memberships"
  ON group_members
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Policy 2: System admins can see all memberships
CREATE POLICY "System admins can see all memberships"
  ON group_members
  FOR SELECT
  TO authenticated
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
  TO authenticated
  USING (
    group_id IN (
      SELECT * FROM get_user_group_ids(auth.uid())
    )
  );
