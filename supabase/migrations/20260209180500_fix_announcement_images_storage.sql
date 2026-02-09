-- ============================================================================
-- Fix announcement images storage bucket setup
-- ============================================================================

-- Drop any existing conflicting policies first
DROP POLICY IF EXISTS "Authenticated users can upload announcement images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view announcement images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own announcement images" ON storage.objects;

-- Create or update the storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'announcement-images',
  'announcement-images',
  true,  -- Public bucket for easy access
  4194304,  -- 4MB limit (4 * 1024 * 1024)
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id)
DO UPDATE SET
  public = true,
  file_size_limit = 4194304,
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

-- Storage policies for announcement images
-- Allow authenticated users to upload images to their own folder
CREATE POLICY "announcement_images_upload_policy"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'announcement-images'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow public read access to all images (since bucket is public)
CREATE POLICY "announcement_images_select_policy"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'announcement-images');

-- Allow users to delete their own images
CREATE POLICY "announcement_images_delete_policy"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'announcement-images'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow users to update their own images
CREATE POLICY "announcement_images_update_policy"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'announcement-images'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'announcement-images'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

COMMENT ON POLICY "announcement_images_upload_policy" ON storage.objects IS
'Users can upload images to their own folder within announcement-images bucket';

COMMENT ON POLICY "announcement_images_select_policy" ON storage.objects IS
'Public read access to all announcement images';

COMMENT ON POLICY "announcement_images_delete_policy" ON storage.objects IS
'Users can only delete images from their own folder';

COMMENT ON POLICY "announcement_images_update_policy" ON storage.objects IS
'Users can only update images in their own folder';
