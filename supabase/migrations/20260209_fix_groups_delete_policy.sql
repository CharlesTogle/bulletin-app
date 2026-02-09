-- ============================================================================
-- FIX: Allow system admins to delete groups
-- ============================================================================
-- System admins need to be able to reject/delete pending groups
-- even if they're not members of the group

-- Drop existing DELETE policy
DROP POLICY IF EXISTS "Admins can delete groups" ON groups;
DROP POLICY IF EXISTS "allow_admin_delete" ON groups;

-- Create new DELETE policy that allows both group admins and system admins
CREATE POLICY "allow_admin_and_system_admin_delete"
  ON groups
  FOR DELETE
  USING (
    -- Group admins can delete their group
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = groups.id
        AND group_members.user_id = auth.uid()
        AND group_members.role = 'admin'
    )
    OR
    -- System admins can delete any group
    EXISTS (
      SELECT 1 FROM system_roles
      WHERE system_roles.user_id = auth.uid()
        AND system_roles.role = 'system_admin'
    )
  );

COMMENT ON POLICY "allow_admin_and_system_admin_delete" ON groups IS
'Allows group admins to delete their own groups, and system admins to delete any group (for rejections).';
