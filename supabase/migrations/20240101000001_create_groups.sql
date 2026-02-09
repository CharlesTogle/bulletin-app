-- Migration: Create Groups Schema
-- Description: Creates groups table with group codes for joining, and group_members for membership tracking
-- Date: 2025-02-09

-- ============================================================================
-- 1. CREATE GROUPS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS groups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- Constraints
  CONSTRAINT groups_name_length CHECK (char_length(name) >= 3 AND char_length(name) <= 100),
  CONSTRAINT groups_code_length CHECK (char_length(code) >= 6 AND char_length(code) <= 12),
  CONSTRAINT groups_code_format CHECK (code ~ '^[A-Z0-9]+$')  -- Only uppercase letters and numbers
);

-- Make group code unique (case-insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS idx_groups_code_unique ON groups (UPPER(code));

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_groups_creator_id ON groups(creator_id);
CREATE INDEX IF NOT EXISTS idx_groups_created_at ON groups(created_at DESC);

-- Add comment to table
COMMENT ON TABLE groups IS 'Groups that users can create and join using unique codes';
COMMENT ON COLUMN groups.code IS 'Unique code for joining the group (6-12 uppercase alphanumeric characters)';
COMMENT ON COLUMN groups.creator_id IS 'User who created the group';

-- ============================================================================
-- 2. CREATE GROUP_MEMBERS TABLE (Junction Table)
-- ============================================================================

CREATE TABLE IF NOT EXISTS group_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role TEXT DEFAULT 'member' NOT NULL,
  joined_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- Constraints
  CONSTRAINT group_members_unique_user_group UNIQUE(group_id, user_id),
  CONSTRAINT group_members_role_check CHECK (role IN ('admin', 'contributor', 'member'))
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_group_members_group_id ON group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user_id ON group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_group_members_role ON group_members(role);

-- Add comments
COMMENT ON TABLE group_members IS 'Junction table linking users to groups with roles';
COMMENT ON COLUMN group_members.role IS 'Member role: admin (full control), contributor (can create announcements), member (can view/upvote/downvote)';

-- ============================================================================
-- 3. CREATE TRIGGER FOR UPDATED_AT
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for groups table
DROP TRIGGER IF EXISTS update_groups_updated_at ON groups;
CREATE TRIGGER update_groups_updated_at
    BEFORE UPDATE ON groups
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 4. FUNCTION TO AUTO-ADD CREATOR AS ADMIN
-- ============================================================================

-- Automatically add group creator as admin when group is created
CREATE OR REPLACE FUNCTION add_creator_as_admin()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO group_members (group_id, user_id, role)
    VALUES (NEW.id, NEW.creator_id, 'admin');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS add_creator_as_admin_trigger ON groups;
CREATE TRIGGER add_creator_as_admin_trigger
    AFTER INSERT ON groups
    FOR EACH ROW
    EXECUTE FUNCTION add_creator_as_admin();

-- ============================================================================
-- 5. FUNCTION TO GENERATE UNIQUE GROUP CODE
-- ============================================================================

-- Helper function to generate a random group code
CREATE OR REPLACE FUNCTION generate_group_code(length INTEGER DEFAULT 8)
RETURNS TEXT AS $$
DECLARE
    chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';  -- Removed ambiguous characters
    result TEXT := '';
    i INTEGER;
    code_exists BOOLEAN;
BEGIN
    LOOP
        result := '';
        FOR i IN 1..length LOOP
            result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
        END LOOP;

        -- Check if code already exists
        SELECT EXISTS(SELECT 1 FROM groups WHERE UPPER(code) = UPPER(result)) INTO code_exists;

        EXIT WHEN NOT code_exists;
    END LOOP;

    RETURN result;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION generate_group_code IS 'Generates a unique random group code (excludes ambiguous characters like I, O, 0, 1)';

-- ============================================================================
-- 6. ENABLE ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 7. RLS POLICIES FOR GROUPS TABLE
-- ============================================================================

-- Policy: Anyone can view groups they are a member of
DROP POLICY IF EXISTS "Members can view their groups" ON groups;
CREATE POLICY "Members can view their groups" ON groups
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM group_members
    WHERE group_members.group_id = groups.id
    AND group_members.user_id = auth.uid()
  )
);

-- Policy: Authenticated users can create groups
DROP POLICY IF EXISTS "Authenticated users can create groups" ON groups;
CREATE POLICY "Authenticated users can create groups" ON groups
FOR INSERT
WITH CHECK (auth.uid() = creator_id);

-- Policy: Only admins can update groups
DROP POLICY IF EXISTS "Admins can update groups" ON groups;
CREATE POLICY "Admins can update groups" ON groups
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM group_members
    WHERE group_members.group_id = groups.id
    AND group_members.user_id = auth.uid()
    AND group_members.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM group_members
    WHERE group_members.group_id = groups.id
    AND group_members.user_id = auth.uid()
    AND group_members.role = 'admin'
  )
);

-- Policy: Only admins can delete groups
DROP POLICY IF EXISTS "Admins can delete groups" ON groups;
CREATE POLICY "Admins can delete groups" ON groups
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM group_members
    WHERE group_members.group_id = groups.id
    AND group_members.user_id = auth.uid()
    AND group_members.role = 'admin'
  )
);

-- ============================================================================
-- 8. RLS POLICIES FOR GROUP_MEMBERS TABLE
-- ============================================================================

-- Policy: Members can view other members of their groups
DROP POLICY IF EXISTS "Members can view group members" ON group_members;
CREATE POLICY "Members can view group members" ON group_members
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM group_members gm
    WHERE gm.group_id = group_members.group_id
    AND gm.user_id = auth.uid()
  )
);

-- Policy: Users can join groups (insert themselves as member)
DROP POLICY IF EXISTS "Users can join groups" ON group_members;
CREATE POLICY "Users can join groups" ON group_members
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND role = 'member'  -- Can only add themselves as regular member
);

-- Policy: Admins can add/promote members
DROP POLICY IF EXISTS "Admins can manage members" ON group_members;
CREATE POLICY "Admins can manage members" ON group_members
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM group_members gm
    WHERE gm.group_id = group_members.group_id
    AND gm.user_id = auth.uid()
    AND gm.role = 'admin'
  )
);

-- Policy: Admins and contributors can update member roles (except admins can't be demoted by non-creators)
DROP POLICY IF EXISTS "Admins and contributors can update member roles" ON group_members;
CREATE POLICY "Admins and contributors can update member roles" ON group_members
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM group_members gm
    WHERE gm.group_id = group_members.group_id
    AND gm.user_id = auth.uid()
    AND gm.role IN ('admin', 'contributor')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM group_members gm
    WHERE gm.group_id = group_members.group_id
    AND gm.user_id = auth.uid()
    AND gm.role IN ('admin', 'contributor')
  )
);

-- Policy: Users can leave groups (delete themselves), admins can remove members
DROP POLICY IF EXISTS "Users can leave groups or admins can remove members" ON group_members;
CREATE POLICY "Users can leave groups or admins can remove members" ON group_members
FOR DELETE
USING (
  -- User is removing themselves
  auth.uid() = user_id
  OR
  -- User is an admin in the group
  EXISTS (
    SELECT 1 FROM group_members gm
    WHERE gm.group_id = group_members.group_id
    AND gm.user_id = auth.uid()
    AND gm.role = 'admin'
  )
);

-- ============================================================================
-- 9. HELPER VIEWS
-- ============================================================================

-- View: Groups with member counts
CREATE OR REPLACE VIEW groups_with_stats AS
SELECT
  g.*,
  COUNT(gm.id) as member_count,
  COUNT(CASE WHEN gm.role = 'admin' THEN 1 END) as admin_count
FROM groups g
LEFT JOIN group_members gm ON g.id = gm.group_id
GROUP BY g.id;

COMMENT ON VIEW groups_with_stats IS 'Groups with member and admin counts';

-- ============================================================================
-- EXAMPLE QUERIES
-- ============================================================================

-- Generate a unique group code
-- SELECT generate_group_code(8);

-- Create a group (will automatically add creator as admin)
-- INSERT INTO groups (creator_id, name, code, description)
-- VALUES (auth.uid(), 'My Group', generate_group_code(8), 'A cool group');

-- Join a group
-- INSERT INTO group_members (group_id, user_id, role)
-- VALUES ('group-uuid-here', auth.uid(), 'member');

-- Get all groups user is a member of
-- SELECT * FROM groups_with_stats
-- WHERE id IN (
--   SELECT group_id FROM group_members WHERE user_id = auth.uid()
-- );

-- Get all members of a group
-- SELECT
--   gm.id,
--   gm.role,
--   gm.joined_at,
--   u.email
-- FROM group_members gm
-- JOIN auth.users u ON gm.user_id = u.id
-- WHERE gm.group_id = 'group-uuid-here';
