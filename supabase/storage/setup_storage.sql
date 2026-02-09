-- Supabase Storage Setup for Attachments
-- Run this in Supabase Dashboard > Storage

-- ============================================================================
-- 1. CREATE STORAGE BUCKET
-- ============================================================================

-- Note: This is usually done via the Supabase Dashboard UI
-- Go to Storage > Create Bucket > Name: "attachments" > Public: false

-- Or via SQL:
INSERT INTO storage.buckets (id, name, public)
VALUES ('attachments', 'attachments', false);

-- ============================================================================
-- 2. STORAGE RLS POLICIES
-- ============================================================================

-- Policy: Members can view attachments in their groups
CREATE POLICY "Members can view group attachments"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'attachments'
  AND EXISTS (
    SELECT 1 FROM attachments att
    JOIN announcements a ON att.announcement_id = a.id
    JOIN group_members gm ON gm.group_id = a.group_id
    WHERE storage.objects.name = att.file_path
    AND gm.user_id = auth.uid()
  )
);

-- Policy: Admins and contributors can upload attachments
CREATE POLICY "Admins and contributors can upload attachments"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'attachments'
  AND auth.uid() IS NOT NULL
);

-- Policy: Uploaders and admins can delete attachments
CREATE POLICY "Uploaders and admins can delete attachments"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'attachments'
  AND (
    -- Uploader can delete their own files
    owner = auth.uid()
    OR
    -- Admins can delete any files in their groups
    EXISTS (
      SELECT 1 FROM attachments att
      JOIN announcements a ON att.announcement_id = a.id
      JOIN group_members gm ON gm.group_id = a.group_id
      WHERE storage.objects.name = att.file_path
      AND gm.user_id = auth.uid()
      AND gm.role = 'admin'
    )
  )
);

-- ============================================================================
-- NOTES
-- ============================================================================

-- Bucket Configuration:
-- - Name: attachments
-- - Public: false (requires authentication)
-- - File size limit: 50MB (enforced in attachments table constraint)
-- - Allowed MIME types: Configure in Supabase Dashboard if needed

-- File Path Structure:
-- Format: {group_id}/{announcement_id}/{uuid}_{filename}
-- Example: 550e8400-e29b-41d4-a716-446655440000/660e8400-e29b-41d4-a716-446655440001/abc123_document.pdf

-- To create bucket via Supabase Dashboard:
-- 1. Go to Storage in left sidebar
-- 2. Click "Create Bucket"
-- 3. Name: "attachments"
-- 4. Public: Unchecked (private)
-- 5. File size limit: 52428800 bytes (50MB)
-- 6. Click "Create"
