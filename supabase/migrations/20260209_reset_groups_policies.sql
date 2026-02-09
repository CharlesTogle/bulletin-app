-- ============================================================================
-- RESET: Drop and recreate all RLS policies on groups table
-- ============================================================================
-- This ensures no conflicts or caching issues

-- Drop ALL existing policies on groups table
DROP POLICY IF EXISTS "Authenticated users can create groups" ON groups;
DROP POLICY IF EXISTS "Users can create groups" ON groups;
DROP POLICY IF EXISTS "Admins can delete groups" ON groups;
DROP POLICY IF EXISTS "Admins can update groups" ON groups;
DROP POLICY IF EXISTS "Members can view their groups" ON groups;
DROP POLICY IF EXISTS "Users can view groups they are members of" ON groups;

-- ============================================================================
-- INSERT POLICY - Allow any authenticated user to create groups
-- ============================================================================
CREATE POLICY "allow_authenticated_insert"
  ON groups
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ============================================================================
-- SELECT POLICIES - Allow users to view groups they're members of
-- ============================================================================
CREATE POLICY "allow_member_select"
  ON groups
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = groups.id
        AND group_members.user_id = auth.uid()
    )
  );

CREATE POLICY "allow_system_admin_select"
  ON groups
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM system_roles
      WHERE system_roles.user_id = auth.uid()
        AND system_roles.role = 'system_admin'
    )
  );

-- ============================================================================
-- UPDATE POLICY - Allow group admins to update
-- ============================================================================
CREATE POLICY "allow_admin_update"
  ON groups
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = groups.id
        AND group_members.user_id = auth.uid()
        AND group_members.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = groups.id
        AND group_members.user_id = auth.uid()
        AND group_members.role = 'admin'
    )
  );

-- ============================================================================
-- DELETE POLICY - Allow group admins to delete
-- ============================================================================
CREATE POLICY "allow_admin_delete"
  ON groups
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = groups.id
        AND group_members.user_id = auth.uid()
        AND group_members.role = 'admin'
    )
  );

-- Add comments
COMMENT ON POLICY "allow_authenticated_insert" ON groups IS
  'Allows any authenticated user to create a new group. They will automatically become admin via trigger.';

COMMENT ON POLICY "allow_member_select" ON groups IS
  'Allows users to view groups they are members of.';

COMMENT ON POLICY "allow_system_admin_select" ON groups IS
  'Allows system admins to view all groups.';

COMMENT ON POLICY "allow_admin_update" ON groups IS
  'Allows group admins to update their group details.';

COMMENT ON POLICY "allow_admin_delete" ON groups IS
  'Allows group admins to delete their group.';
