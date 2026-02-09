-- ============================================================================
-- FIX ALL RLS POLICIES
-- ============================================================================
-- Fixes circular dependencies and permission issues
-- ============================================================================

-- ============================================================================
-- 1. FIX SYSTEM_ROLES RLS (Circular dependency)
-- ============================================================================

-- Drop broken policy
DROP POLICY IF EXISTS "System admins can view all system roles" ON system_roles;

-- Allow users to view their OWN role (breaks circular dependency)
CREATE POLICY "Users can view their own system role"
  ON system_roles
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- System admins can view ALL roles (for admin panel)
CREATE POLICY "System admins can view all system roles"
  ON system_roles
  FOR SELECT
  TO authenticated
  USING (
    -- User is a system admin (can check because of policy above)
    user_id IN (
      SELECT user_id FROM system_roles WHERE role = 'system_admin'
    )
  );

-- ============================================================================
-- 2. FIX GROUPS RLS (Add system admin access)
-- ============================================================================

-- Drop and recreate the groups view policy with system admin access
DROP POLICY IF EXISTS "Members can view their groups" ON groups;
DROP POLICY IF EXISTS "Users can view groups they are members of" ON groups;

CREATE POLICY "Users can view their groups"
  ON groups
  FOR SELECT
  TO authenticated
  USING (
    -- User is a member of the group
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = groups.id
      AND group_members.user_id = auth.uid()
    )
    OR
    -- User is a system admin (can see all groups)
    EXISTS (
      SELECT 1 FROM system_roles
      WHERE system_roles.user_id = auth.uid()
      AND system_roles.role = 'system_admin'
    )
  );

-- ============================================================================
-- 3. FIX GROUP_MEMBERS RLS (Add system admin access)
-- ============================================================================

-- Drop and recreate with system admin access
DROP POLICY IF EXISTS "Members can view group members" ON group_members;

CREATE POLICY "Users can view group members"
  ON group_members
  FOR SELECT
  TO authenticated
  USING (
    -- User is in the same group
    group_id IN (
      SELECT group_id FROM group_members WHERE user_id = auth.uid()
    )
    OR
    -- User is a system admin
    EXISTS (
      SELECT 1 FROM system_roles
      WHERE system_roles.user_id = auth.uid()
      AND system_roles.role = 'system_admin'
    )
  );

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- Run these to verify the fix worked:

-- 1. Check if you can see your own role
-- SELECT * FROM system_roles WHERE user_id = auth.uid();

-- 2. Test the helper function
-- SELECT is_system_admin(auth.uid()) as am_i_admin;

-- 3. Check if you can see groups
-- SELECT * FROM groups LIMIT 5;

-- 4. Check if you can see group members
-- SELECT * FROM group_members LIMIT 5;
