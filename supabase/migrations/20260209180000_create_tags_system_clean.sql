-- ============================================================================
-- Tags System for Announcements (CLEAN VERSION)
-- First drops existing tables if they exist, then recreates them properly
-- ============================================================================

-- Drop existing tables and their dependencies
DROP TABLE IF EXISTS announcement_tags CASCADE;
DROP TABLE IF EXISTS tags CASCADE;

-- Drop existing functions
DROP FUNCTION IF EXISTS get_announcement_tags(UUID);
DROP FUNCTION IF EXISTS get_group_tags(UUID);

-- ============================================================================
-- Create tags table
-- ============================================================================

CREATE TABLE tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (char_length(title) > 0 AND char_length(title) <= 50),
  color TEXT NOT NULL DEFAULT '#3b82f6' CHECK (color ~ '^#[0-9a-fA-F]{6}$'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  UNIQUE(group_id, title)
);

CREATE INDEX idx_tags_group_id ON tags(group_id);
CREATE INDEX idx_tags_created_by ON tags(created_by);

COMMENT ON TABLE tags IS 'Tags that can be applied to announcements within a group';
COMMENT ON COLUMN tags.title IS 'Tag name (max 50 characters, unique per group)';
COMMENT ON COLUMN tags.color IS 'Hex color code for the tag';

-- ============================================================================
-- Create announcement_tags junction table
-- ============================================================================

CREATE TABLE announcement_tags (
  announcement_id UUID NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (announcement_id, tag_id)
);

CREATE INDEX idx_announcement_tags_announcement_id ON announcement_tags(announcement_id);
CREATE INDEX idx_announcement_tags_tag_id ON announcement_tags(tag_id);

COMMENT ON TABLE announcement_tags IS 'Junction table linking announcements to tags';

-- ============================================================================
-- RLS Policies for Tags
-- ============================================================================

ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcement_tags ENABLE ROW LEVEL SECURITY;

-- Tags Policies
-- Anyone in the group can view tags
CREATE POLICY "Group members can view tags"
  ON tags FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = tags.group_id
      AND group_members.user_id = auth.uid()
    )
  );

-- Only group admins can create tags
CREATE POLICY "Group admins can create tags"
  ON tags FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = tags.group_id
      AND group_members.user_id = auth.uid()
      AND group_members.role = 'admin'
    )
  );

-- Only group admins can update tags
CREATE POLICY "Group admins can update tags"
  ON tags FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = tags.group_id
      AND group_members.user_id = auth.uid()
      AND group_members.role = 'admin'
    )
  );

-- Only group admins can delete tags
CREATE POLICY "Group admins can delete tags"
  ON tags FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = tags.group_id
      AND group_members.user_id = auth.uid()
      AND group_members.role = 'admin'
    )
  );

-- Announcement Tags Policies
-- Anyone in the group can view announcement tags
CREATE POLICY "Group members can view announcement tags"
  ON announcement_tags FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM announcements a
      JOIN group_members gm ON gm.group_id = a.group_id
      WHERE a.id = announcement_tags.announcement_id
      AND gm.user_id = auth.uid()
    )
  );

-- Contributors and admins can add tags to their own announcements
CREATE POLICY "Contributors can add tags to their announcements"
  ON announcement_tags FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM announcements a
      JOIN group_members gm ON gm.group_id = a.group_id
      WHERE a.id = announcement_tags.announcement_id
      AND gm.user_id = auth.uid()
      AND gm.role IN ('admin', 'contributor')
      AND (a.author_id = auth.uid() OR gm.role = 'admin')
    )
  );

-- Contributors can remove tags from their own announcements, admins can remove any
CREATE POLICY "Contributors can remove tags from their announcements"
  ON announcement_tags FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM announcements a
      JOIN group_members gm ON gm.group_id = a.group_id
      WHERE a.id = announcement_tags.announcement_id
      AND gm.user_id = auth.uid()
      AND gm.role IN ('admin', 'contributor')
      AND (a.author_id = auth.uid() OR gm.role = 'admin')
    )
  );

-- ============================================================================
-- Helper Functions
-- ============================================================================

-- Function to get tags for an announcement
CREATE OR REPLACE FUNCTION get_announcement_tags(announcement_id_param UUID)
RETURNS TABLE (
  id UUID,
  title TEXT,
  color TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT t.id, t.title, t.color
  FROM tags t
  JOIN announcement_tags at ON at.tag_id = t.id
  WHERE at.announcement_id = announcement_id_param
  ORDER BY t.title;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get all tags for a group
CREATE OR REPLACE FUNCTION get_group_tags(group_id_param UUID)
RETURNS TABLE (
  id UUID,
  title TEXT,
  color TEXT,
  usage_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.id,
    t.title,
    t.color,
    COUNT(at.announcement_id) as usage_count
  FROM tags t
  LEFT JOIN announcement_tags at ON at.tag_id = t.id
  WHERE t.group_id = group_id_param
  GROUP BY t.id, t.title, t.color
  ORDER BY t.title;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
