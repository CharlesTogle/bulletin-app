-- ============================================================================
-- GROUP APPROVAL SYSTEM
-- ============================================================================
-- Adds approval workflow for groups
-- System admins must approve new groups before they become active
-- ============================================================================

-- Add approved column to groups table
ALTER TABLE groups
ADD COLUMN approved BOOLEAN DEFAULT FALSE NOT NULL,
ADD COLUMN approved_at TIMESTAMPTZ,
ADD COLUMN approved_by UUID REFERENCES auth.users(id);

-- Create index for faster filtering
CREATE INDEX IF NOT EXISTS idx_groups_approved ON groups(approved);

-- Add comment
COMMENT ON COLUMN groups.approved IS 'Whether the group has been approved by a system admin. Groups must be approved before members can join.';
COMMENT ON COLUMN groups.approved_at IS 'When the group was approved (UTC)';
COMMENT ON COLUMN groups.approved_by IS 'System admin who approved the group';

-- ============================================================================
-- UPDATE RLS POLICIES
-- ============================================================================

-- Drop existing group view policy and recreate with approval check
DROP POLICY IF EXISTS "Users can view groups they are members of" ON groups;

-- Group admins/contributors/members can view their groups (even if not approved)
-- Other users cannot see unapproved groups
DROP POLICY IF EXISTS "Users can view groups they are members of" ON groups;
CREATE POLICY "Users can view groups they are members of" ON groups
  FOR SELECT
  TO authenticated
  USING (
    -- User is a member of the group (can see even if not approved)
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = groups.id
      AND group_members.user_id = auth.uid()
    )
    OR
    -- System admins can see all groups
    EXISTS (
      SELECT 1 FROM system_roles
      WHERE system_roles.user_id = auth.uid()
      AND system_roles.role = 'system_admin'
    )
  );

-- Update group_members policy to prevent joining unapproved groups
-- Drop and recreate the insert policy
DROP POLICY IF EXISTS "Users can join groups as member" ON group_members;
DROP POLICY IF EXISTS "Admins can add members with any role" ON group_members;

-- Regular users can only join approved groups as member
DROP POLICY IF EXISTS "Users can join approved groups as member" ON group_members;
CREATE POLICY "Users can join approved groups as member" ON group_members
  FOR INSERT
  TO authenticated
  WITH CHECK (
    role = 'member'
    AND user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM groups
      WHERE groups.id = group_members.group_id
      AND groups.approved = TRUE  -- Must be approved
    )
  );

-- Admins can add members with any role (even to unapproved groups - for internal setup)
-- System admins can also add members to any group
DROP POLICY IF EXISTS "Admins can add members with any role" ON group_members;
CREATE POLICY "Admins can add members with any role" ON group_members
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- User is admin of the group
    EXISTS (
      SELECT 1 FROM group_members gm
      WHERE gm.group_id = group_members.group_id
      AND gm.user_id = auth.uid()
      AND gm.role = 'admin'
    )
    OR
    -- User is system admin
    EXISTS (
      SELECT 1 FROM system_roles
      WHERE system_roles.user_id = auth.uid()
      AND system_roles.role = 'system_admin'
    )
  );

-- ============================================================================
-- HELPER VIEWS
-- ============================================================================

-- View for pending groups (for system admin dashboard)
CREATE OR REPLACE VIEW pending_groups AS
SELECT
  g.id,
  g.name,
  g.code,
  g.description,
  g.created_at,
  u.email as creator_email,
  COUNT(DISTINCT gm.user_id) as admin_count
FROM groups g
LEFT JOIN auth.users u ON g.creator_id = u.id
LEFT JOIN group_members gm ON g.id = gm.group_id AND gm.role = 'admin'
WHERE g.approved = FALSE
GROUP BY g.id, g.name, g.code, g.description, g.created_at, u.email
ORDER BY g.created_at DESC;

-- Set security invoker for the view
ALTER VIEW pending_groups SET (security_invoker = on);

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON VIEW pending_groups IS 'Groups awaiting system admin approval';
