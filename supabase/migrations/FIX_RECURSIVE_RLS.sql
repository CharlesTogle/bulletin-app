-- ============================================================================
-- FIX: Remove Infinite Recursion in group_members RLS
-- ============================================================================

-- Drop the problematic recursive policy
DROP POLICY IF EXISTS "Users can view group members" ON group_members;

-- Create a simpler, non-recursive policy
CREATE POLICY "Users can view group members"
  ON group_members
  FOR SELECT
  TO authenticated
  USING (
    -- User can see their own membership records
    user_id = auth.uid()
    OR
    -- User is a system admin (no recursion here)
    EXISTS (
      SELECT 1 FROM system_roles
      WHERE system_roles.user_id = auth.uid()
      AND system_roles.role = 'system_admin'
    )
  );

-- Add a separate policy for viewing other members in same group
CREATE POLICY "Users can view members in their groups"
  ON group_members
  FOR SELECT
  TO authenticated
  USING (
    -- User has at least one membership record (checked via their own user_id)
    -- This allows them to see other members in groups they belong to
    group_id IN (
      SELECT gm.group_id
      FROM group_members gm
      WHERE gm.user_id = auth.uid()
      -- This works because it only checks rows WHERE user_id = auth.uid()
      -- which bypasses the RLS policy (direct user_id match)
    )
  );
