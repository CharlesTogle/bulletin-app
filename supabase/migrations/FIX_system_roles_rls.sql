-- ============================================================================
-- FIX: System Roles RLS Policy
-- ============================================================================
-- The original policy had circular logic:
-- "Only system admins can view system_roles"
-- But to know if you're an admin, you need to query system_roles!
--
-- Fix: Allow users to view their OWN role
-- ============================================================================

-- Drop the problematic policy
DROP POLICY IF EXISTS "System admins can view all system roles" ON system_roles;

-- Create new policy: Users can view their own role
CREATE POLICY "Users can view their own system role"
  ON system_roles
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Keep the insert/delete policies for system admins only
-- (These are still correct)
