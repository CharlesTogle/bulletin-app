-- ============================================================================
-- FIX: Allow system admins to update groups
-- ============================================================================
-- System admins need to be able to approve/update groups
-- even if they're not members of the group

-- Drop existing UPDATE policy
DROP POLICY IF EXISTS "Admins can update groups" ON groups;
DROP POLICY IF EXISTS "allow_admin_update" ON groups;

-- Create new UPDATE policy that allows both group admins and system admins
CREATE POLICY "allow_admin_and_system_admin_update"
  ON groups
  FOR UPDATE
  USING (
    -- Group admins can update their group
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = groups.id
        AND group_members.user_id = auth.uid()
        AND group_members.role = 'admin'
    )
    OR
    -- System admins can update any group
    EXISTS (
      SELECT 1 FROM system_roles
      WHERE system_roles.user_id = auth.uid()
        AND system_roles.role = 'system_admin'
    )
  )
  WITH CHECK (
    -- Same checks for the updated data
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = groups.id
        AND group_members.user_id = auth.uid()
        AND group_members.role = 'admin'
    )
    OR
    EXISTS (
      SELECT 1 FROM system_roles
      WHERE system_roles.user_id = auth.uid()
        AND system_roles.role = 'system_admin'
    )
  );

COMMENT ON POLICY "allow_admin_and_system_admin_update" ON groups IS
'Allows group admins to update their own groups, and system admins to update any group (for approvals).';
