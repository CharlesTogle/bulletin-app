-- ============================================================================
-- FIX: Add missing INSERT policy for groups table
-- ============================================================================
-- The group approval migration dropped/modified policies but didn't recreate
-- the INSERT policy for creating groups

-- Drop existing policy if any
DROP POLICY IF EXISTS "Authenticated users can create groups" ON groups;
DROP POLICY IF EXISTS "Users can create groups" ON groups;

-- Allow authenticated users to create groups (they become the creator)
CREATE POLICY "Users can create groups"
  ON groups
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = creator_id
  );

-- Add comment
COMMENT ON POLICY "Users can create groups" ON groups IS
'Allows any authenticated user to create a new group. The group starts as unapproved and requires system admin approval.';
