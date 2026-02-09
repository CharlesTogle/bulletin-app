-- ============================================================================
-- Add image upload support to announcements
-- ============================================================================

-- Add image_url column to announcements table
ALTER TABLE announcements
ADD COLUMN IF NOT EXISTS image_url TEXT;

COMMENT ON COLUMN announcements.image_url IS 'URL to uploaded image in Supabase Storage (max 4MB)';

-- Create storage bucket for announcement images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'announcement-images',
  'announcement-images',
  true,  -- Public bucket for easy access
  4194304,  -- 4MB limit (4 * 1024 * 1024)
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for announcement images
-- Allow authenticated users to upload images
CREATE POLICY "Authenticated users can upload announcement images"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'announcement-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow anyone to view images (public bucket)
CREATE POLICY "Anyone can view announcement images"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'announcement-images');

-- Allow users to delete their own images
CREATE POLICY "Users can delete their own announcement images"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'announcement-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

COMMENT ON POLICY "Authenticated users can upload announcement images" ON storage.objects IS
'Users can upload images to their own folder within announcement-images bucket';

COMMENT ON POLICY "Users can delete their own announcement images" ON storage.objects IS
'Users can only delete images from their own folder';
