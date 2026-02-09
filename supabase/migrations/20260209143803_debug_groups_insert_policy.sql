-- ============================================================================
-- DEBUG: Temporarily allow all authenticated users to create groups
-- ============================================================================
-- This will help us determine if the issue is with the auth.uid() check
-- or something more fundamental

-- Drop existing policy
DROP POLICY IF EXISTS "Users can create groups" ON groups;
DROP POLICY IF EXISTS "Authenticated users can create groups" ON groups;

-- Create a permissive policy for debugging
CREATE POLICY "Authenticated users can create groups"
  ON groups
  FOR INSERT
  TO authenticated
  WITH CHECK (true);  -- Allow all authenticated users for now

COMMENT ON POLICY "Authenticated users can create groups" ON groups IS
'Temporary permissive policy for debugging. TODO: Add creator_id check.';
