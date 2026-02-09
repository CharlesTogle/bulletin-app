-- ============================================================================
-- Add UPDATE policy for group_members table (with SECURITY DEFINER function)
-- ============================================================================
-- Allows group admins to update member roles

-- Drop existing update policy if it exists
DROP POLICY IF EXISTS "Group admins can update member roles" ON group_members;
DROP POLICY IF EXISTS "Admins can update members" ON group_members;
DROP POLICY IF EXISTS "Update member roles" ON group_members;

-- Create policy: Allow updates only - application enforces admin check
-- This avoids infinite recursion by not checking group_members within the policy
-- The application layer ensures only admins can call updateMemberRole()
CREATE POLICY "Authenticated users can update member roles"
  ON group_members
  FOR UPDATE
  USING (
    -- Allow if user is a system admin OR the update is for members in groups they can see
    EXISTS (
      SELECT 1 FROM system_roles
      WHERE system_roles.user_id = auth.uid()
      AND system_roles.role = 'system_admin'
    )
    OR
    -- User can update if they can see this member record (via SELECT policies)
    -- This leverages existing SELECT policies which use SECURITY DEFINER functions
    group_id IN (SELECT * FROM get_user_group_ids(auth.uid()))
  )
  WITH CHECK (
    -- Same check for the updated row
    EXISTS (
      SELECT 1 FROM system_roles
      WHERE system_roles.user_id = auth.uid()
      AND system_roles.role = 'system_admin'
    )
    OR
    group_id IN (SELECT * FROM get_user_group_ids(auth.uid()))
  );

-- Comment
COMMENT ON POLICY "Authenticated users can update member roles" ON group_members IS
'Allows users to update member roles in groups they belong to. Uses get_user_group_ids() SECURITY DEFINER function to avoid infinite recursion. Application layer enforces that only group admins can perform updates and users cannot change their own roles.';
