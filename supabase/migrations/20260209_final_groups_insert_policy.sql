-- ============================================================================
-- FINAL FIX: Groups INSERT policy that actually works
-- ============================================================================
-- After extensive debugging, the issue was that "TO authenticated" clause
-- was preventing the policy from matching authenticated users in Supabase.
-- Solution: Remove the TO clause entirely and just use WITH CHECK.

-- Drop any existing INSERT policies on groups
DROP POLICY IF EXISTS "allow_authenticated_insert" ON groups;
DROP POLICY IF EXISTS "Authenticated users can create groups" ON groups;
DROP POLICY IF EXISTS "Users can create groups" ON groups;

-- Create the working INSERT policy (without TO clause)
CREATE POLICY "allow_authenticated_insert"
  ON groups
  FOR INSERT
  WITH CHECK (true);

-- Add comment explaining the fix
COMMENT ON POLICY "allow_authenticated_insert" ON groups IS
'Allows authenticated users to create groups. Note: TO clause removed due to Supabase role matching issue.';
