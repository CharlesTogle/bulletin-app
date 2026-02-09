-- Migration: Create Announcements System
-- Description: Creates announcements, votes, categories, tags, and attachments with Supabase Storage integration
-- Date: 2025-02-09

-- ============================================================================
-- 1. CREATE CATEGORIES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#6366f1',  -- Hex color for UI
  icon TEXT,  -- Icon name (from lucide-react)
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  CONSTRAINT categories_name_length CHECK (char_length(name) >= 2 AND char_length(name) <= 50),
  CONSTRAINT categories_color_format CHECK (color ~ '^#[0-9A-Fa-f]{6}$')
);

-- Make category names unique per system (case-insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS idx_categories_name_unique ON categories (LOWER(name));

CREATE INDEX IF NOT EXISTS idx_categories_name ON categories(name);

COMMENT ON TABLE categories IS 'Categories for organizing announcements';
COMMENT ON COLUMN categories.color IS 'Hex color code for UI display';
COMMENT ON COLUMN categories.icon IS 'Icon name from lucide-react library';

-- ============================================================================
-- 2. CREATE TAGS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS tags (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  CONSTRAINT tags_name_length CHECK (char_length(name) >= 2 AND char_length(name) <= 30)
);

-- Make tag names unique (case-insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS idx_tags_name_unique ON tags (LOWER(name));

CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name);

COMMENT ON TABLE tags IS 'Tags for labeling announcements';

-- ============================================================================
-- 3. CREATE ANNOUNCEMENTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS announcements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE NOT NULL,
  author_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,

  title TEXT NOT NULL,
  content TEXT NOT NULL,  -- Markdown content

  deadline TIMESTAMPTZ,  -- Optional deadline in UTC

  is_pinned BOOLEAN DEFAULT FALSE,  -- Pinned announcements appear at top
  is_archived BOOLEAN DEFAULT FALSE,  -- Archived announcements hidden by default

  upvotes_count INTEGER DEFAULT 0 NOT NULL,
  downvotes_count INTEGER DEFAULT 0 NOT NULL,

  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  CONSTRAINT announcements_title_length CHECK (char_length(title) >= 3 AND char_length(title) <= 200),
  CONSTRAINT announcements_content_length CHECK (char_length(content) >= 1 AND char_length(content) <= 50000),
  CONSTRAINT announcements_votes_positive CHECK (upvotes_count >= 0 AND downvotes_count >= 0)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_announcements_group_id ON announcements(group_id);
CREATE INDEX IF NOT EXISTS idx_announcements_author_id ON announcements(author_id);
CREATE INDEX IF NOT EXISTS idx_announcements_category_id ON announcements(category_id);
CREATE INDEX IF NOT EXISTS idx_announcements_created_at ON announcements(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_announcements_deadline ON announcements(deadline) WHERE deadline IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_announcements_pinned ON announcements(is_pinned) WHERE is_pinned = TRUE;

COMMENT ON TABLE announcements IS 'Announcements within groups with markdown support';
COMMENT ON COLUMN announcements.content IS 'Markdown formatted content';
COMMENT ON COLUMN announcements.deadline IS 'Optional deadline in UTC timezone';
COMMENT ON COLUMN announcements.is_pinned IS 'Pinned announcements appear at the top';
COMMENT ON COLUMN announcements.is_archived IS 'Archived announcements hidden from normal view';

-- ============================================================================
-- 4. CREATE ANNOUNCEMENT_TAGS JUNCTION TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS announcement_tags (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  announcement_id UUID REFERENCES announcements(id) ON DELETE CASCADE NOT NULL,
  tag_id UUID REFERENCES tags(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  CONSTRAINT announcement_tags_unique UNIQUE(announcement_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_announcement_tags_announcement_id ON announcement_tags(announcement_id);
CREATE INDEX IF NOT EXISTS idx_announcement_tags_tag_id ON announcement_tags(tag_id);

COMMENT ON TABLE announcement_tags IS 'Many-to-many relationship between announcements and tags';

-- ============================================================================
-- 5. CREATE VOTES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS votes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  announcement_id UUID REFERENCES announcements(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  vote_type TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  CONSTRAINT votes_unique_user_announcement UNIQUE(announcement_id, user_id),
  CONSTRAINT votes_type_check CHECK (vote_type IN ('upvote', 'downvote'))
);

CREATE INDEX IF NOT EXISTS idx_votes_announcement_id ON votes(announcement_id);
CREATE INDEX IF NOT EXISTS idx_votes_user_id ON votes(user_id);
CREATE INDEX IF NOT EXISTS idx_votes_type ON votes(vote_type);

COMMENT ON TABLE votes IS 'User votes on announcements (one vote per user per announcement)';
COMMENT ON COLUMN votes.vote_type IS 'Type of vote: upvote or downvote';

-- ============================================================================
-- 6. CREATE ATTACHMENTS TABLE (Supabase Storage)
-- ============================================================================

CREATE TABLE IF NOT EXISTS attachments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  announcement_id UUID REFERENCES announcements(id) ON DELETE CASCADE NOT NULL,
  uploader_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  filename TEXT NOT NULL,
  file_path TEXT NOT NULL,  -- Path in Supabase Storage
  file_size BIGINT NOT NULL,  -- Size in bytes
  mime_type TEXT NOT NULL,

  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  CONSTRAINT attachments_filename_length CHECK (char_length(filename) >= 1 AND char_length(filename) <= 255),
  CONSTRAINT attachments_file_size_limit CHECK (file_size > 0 AND file_size <= 52428800)  -- 50MB limit
);

CREATE INDEX IF NOT EXISTS idx_attachments_announcement_id ON attachments(announcement_id);
CREATE INDEX IF NOT EXISTS idx_attachments_uploader_id ON attachments(uploader_id);

COMMENT ON TABLE attachments IS 'File attachments stored in Supabase Storage';
COMMENT ON COLUMN attachments.file_path IS 'Path to file in Supabase Storage bucket';
COMMENT ON COLUMN attachments.file_size IS 'File size in bytes (max 50MB)';

-- ============================================================================
-- 7. CREATE TRIGGERS FOR UPDATED_AT
-- ============================================================================

-- Trigger for announcements
DROP TRIGGER IF EXISTS update_announcements_updated_at ON announcements;
CREATE TRIGGER update_announcements_updated_at
    BEFORE UPDATE ON announcements
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for votes
DROP TRIGGER IF EXISTS update_votes_updated_at ON votes;
CREATE TRIGGER update_votes_updated_at
    BEFORE UPDATE ON votes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 8. CREATE FUNCTION TO UPDATE VOTE COUNTS
-- ============================================================================

CREATE OR REPLACE FUNCTION update_announcement_vote_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.vote_type = 'upvote' THEN
      UPDATE announcements SET upvotes_count = upvotes_count + 1 WHERE id = NEW.announcement_id;
    ELSE
      UPDATE announcements SET downvotes_count = downvotes_count + 1 WHERE id = NEW.announcement_id;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    -- User changed their vote
    IF OLD.vote_type = 'upvote' AND NEW.vote_type = 'downvote' THEN
      UPDATE announcements
      SET upvotes_count = upvotes_count - 1, downvotes_count = downvotes_count + 1
      WHERE id = NEW.announcement_id;
    ELSIF OLD.vote_type = 'downvote' AND NEW.vote_type = 'upvote' THEN
      UPDATE announcements
      SET upvotes_count = upvotes_count + 1, downvotes_count = downvotes_count - 1
      WHERE id = NEW.announcement_id;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.vote_type = 'upvote' THEN
      UPDATE announcements SET upvotes_count = upvotes_count - 1 WHERE id = OLD.announcement_id;
    ELSE
      UPDATE announcements SET downvotes_count = downvotes_count - 1 WHERE id = OLD.announcement_id;
    END IF;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update vote counts
DROP TRIGGER IF EXISTS update_vote_counts_trigger ON votes;
CREATE TRIGGER update_vote_counts_trigger
    AFTER INSERT OR UPDATE OR DELETE ON votes
    FOR EACH ROW
    EXECUTE FUNCTION update_announcement_vote_counts();

-- ============================================================================
-- 9. ENABLE ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcement_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 10. RLS POLICIES FOR CATEGORIES
-- ============================================================================

-- Anyone can view categories
DROP POLICY IF EXISTS "Anyone can view categories" ON categories;
CREATE POLICY "Anyone can view categories" ON categories
FOR SELECT
USING (true);

-- Only authenticated users can create categories (for now - can be restricted later)
DROP POLICY IF EXISTS "Authenticated users can create categories" ON categories;
CREATE POLICY "Authenticated users can create categories" ON categories
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================================
-- 11. RLS POLICIES FOR TAGS
-- ============================================================================

-- Anyone can view tags
DROP POLICY IF EXISTS "Anyone can view tags" ON tags;
CREATE POLICY "Anyone can view tags" ON tags
FOR SELECT
USING (true);

-- Authenticated users can create tags
DROP POLICY IF EXISTS "Authenticated users can create tags" ON tags;
CREATE POLICY "Authenticated users can create tags" ON tags
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================================
-- 12. RLS POLICIES FOR ANNOUNCEMENTS
-- ============================================================================

-- Members can view announcements in their groups (exclude archived unless admin)
DROP POLICY IF EXISTS "Members can view group announcements" ON announcements;
CREATE POLICY "Members can view group announcements" ON announcements
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM group_members gm
    WHERE gm.group_id = announcements.group_id
    AND gm.user_id = auth.uid()
  )
  AND (
    is_archived = FALSE
    OR EXISTS (
      SELECT 1 FROM group_members gm
      WHERE gm.group_id = announcements.group_id
      AND gm.user_id = auth.uid()
      AND gm.role = 'admin'
    )
  )
);

-- Admins and contributors can create announcements
DROP POLICY IF EXISTS "Admins and contributors can create announcements" ON announcements;
CREATE POLICY "Admins and contributors can create announcements" ON announcements
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM group_members gm
    WHERE gm.group_id = announcements.group_id
    AND gm.user_id = auth.uid()
    AND gm.role IN ('admin', 'contributor')
  )
  AND auth.uid() = author_id
);

-- Authors can update their own announcements, admins can update any
DROP POLICY IF EXISTS "Authors and admins can update announcements" ON announcements;
CREATE POLICY "Authors and admins can update announcements" ON announcements
FOR UPDATE
USING (
  auth.uid() = author_id
  OR EXISTS (
    SELECT 1 FROM group_members gm
    WHERE gm.group_id = announcements.group_id
    AND gm.user_id = auth.uid()
    AND gm.role = 'admin'
  )
)
WITH CHECK (
  auth.uid() = author_id
  OR EXISTS (
    SELECT 1 FROM group_members gm
    WHERE gm.group_id = announcements.group_id
    AND gm.user_id = auth.uid()
    AND gm.role = 'admin'
  )
);

-- Authors can delete their own announcements, admins can delete any
DROP POLICY IF EXISTS "Authors and admins can delete announcements" ON announcements;
CREATE POLICY "Authors and admins can delete announcements" ON announcements
FOR DELETE
USING (
  auth.uid() = author_id
  OR EXISTS (
    SELECT 1 FROM group_members gm
    WHERE gm.group_id = announcements.group_id
    AND gm.user_id = auth.uid()
    AND gm.role = 'admin'
  )
);

-- ============================================================================
-- 13. RLS POLICIES FOR ANNOUNCEMENT_TAGS
-- ============================================================================

-- Members can view tags on announcements in their groups
DROP POLICY IF EXISTS "Members can view announcement tags" ON announcement_tags;
CREATE POLICY "Members can view announcement tags" ON announcement_tags
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM announcements a
    JOIN group_members gm ON gm.group_id = a.group_id
    WHERE a.id = announcement_tags.announcement_id
    AND gm.user_id = auth.uid()
  )
);

-- Authors and admins can add tags to announcements
DROP POLICY IF EXISTS "Authors and admins can add tags" ON announcement_tags;
CREATE POLICY "Authors and admins can add tags" ON announcement_tags
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM announcements a
    JOIN group_members gm ON gm.group_id = a.group_id
    WHERE a.id = announcement_tags.announcement_id
    AND (
      a.author_id = auth.uid()
      OR (gm.user_id = auth.uid() AND gm.role = 'admin')
    )
  )
);

-- Authors and admins can remove tags
DROP POLICY IF EXISTS "Authors and admins can remove tags" ON announcement_tags;
CREATE POLICY "Authors and admins can remove tags" ON announcement_tags
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM announcements a
    JOIN group_members gm ON gm.group_id = a.group_id
    WHERE a.id = announcement_tags.announcement_id
    AND (
      a.author_id = auth.uid()
      OR (gm.user_id = auth.uid() AND gm.role = 'admin')
    )
  )
);

-- ============================================================================
-- 14. RLS POLICIES FOR VOTES
-- ============================================================================

-- Members can view votes on announcements in their groups
DROP POLICY IF EXISTS "Members can view votes" ON votes;
CREATE POLICY "Members can view votes" ON votes
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM announcements a
    JOIN group_members gm ON gm.group_id = a.group_id
    WHERE a.id = votes.announcement_id
    AND gm.user_id = auth.uid()
  )
);

-- Members can cast votes
DROP POLICY IF EXISTS "Members can vote" ON votes;
CREATE POLICY "Members can vote" ON votes
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM announcements a
    JOIN group_members gm ON gm.group_id = a.group_id
    WHERE a.id = votes.announcement_id
    AND gm.user_id = auth.uid()
  )
  AND auth.uid() = user_id
);

-- Users can change their own votes
DROP POLICY IF EXISTS "Users can change their votes" ON votes;
CREATE POLICY "Users can change their votes" ON votes
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Users can remove their own votes
DROP POLICY IF EXISTS "Users can remove their votes" ON votes;
CREATE POLICY "Users can remove their votes" ON votes
FOR DELETE
USING (auth.uid() = user_id);

-- ============================================================================
-- 15. RLS POLICIES FOR ATTACHMENTS
-- ============================================================================

-- Members can view attachments on announcements in their groups
DROP POLICY IF EXISTS "Members can view attachments" ON attachments;
CREATE POLICY "Members can view attachments" ON attachments
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM announcements a
    JOIN group_members gm ON gm.group_id = a.group_id
    WHERE a.id = attachments.announcement_id
    AND gm.user_id = auth.uid()
  )
);

-- Authors and admins can add attachments
DROP POLICY IF EXISTS "Authors and admins can add attachments" ON attachments;
CREATE POLICY "Authors and admins can add attachments" ON attachments
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM announcements a
    JOIN group_members gm ON gm.group_id = a.group_id
    WHERE a.id = attachments.announcement_id
    AND (
      a.author_id = auth.uid()
      OR (gm.user_id = auth.uid() AND gm.role = 'admin')
    )
  )
  AND auth.uid() = uploader_id
);

-- Uploaders and admins can delete attachments
DROP POLICY IF EXISTS "Uploaders and admins can delete attachments" ON attachments;
CREATE POLICY "Uploaders and admins can delete attachments" ON attachments
FOR DELETE
USING (
  auth.uid() = uploader_id
  OR EXISTS (
    SELECT 1 FROM announcements a
    JOIN group_members gm ON gm.group_id = a.group_id
    WHERE a.id = attachments.announcement_id
    AND gm.user_id = auth.uid()
    AND gm.role = 'admin'
  )
);

-- ============================================================================
-- 16. CREATE HELPFUL VIEWS
-- ============================================================================

-- View: Announcements with vote counts and tag info
CREATE OR REPLACE VIEW announcements_with_details AS
SELECT
  a.*,
  u.email as author_email,
  c.name as category_name,
  c.color as category_color,
  ARRAY_AGG(DISTINCT t.name) FILTER (WHERE t.name IS NOT NULL) as tag_names,
  (a.upvotes_count - a.downvotes_count) as net_votes
FROM announcements a
LEFT JOIN auth.users u ON a.author_id = u.id
LEFT JOIN categories c ON a.category_id = c.id
LEFT JOIN announcement_tags at ON a.id = at.announcement_id
LEFT JOIN tags t ON at.tag_id = t.id
GROUP BY a.id, u.email, c.name, c.color;

COMMENT ON VIEW announcements_with_details IS 'Announcements with author, category, tags, and calculated net votes';
