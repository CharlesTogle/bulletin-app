-- Example: Row Level Security (RLS) Policies for Bulletin App
--
-- These policies ensure users can only access their own data
-- Run these in your Supabase SQL Editor

-- Enable RLS on the posts table
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own posts
CREATE POLICY "Users can view own posts"
ON posts
FOR SELECT
USING (auth.uid() = user_id);

-- Policy: Users can insert their own posts
CREATE POLICY "Users can insert own posts"
ON posts
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own posts
CREATE POLICY "Users can update own posts"
ON posts
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own posts
CREATE POLICY "Users can delete own posts"
ON posts
FOR DELETE
USING (auth.uid() = user_id);

-- Example table structure for posts
-- CREATE TABLE posts (
--   id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
--   user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
--   title TEXT NOT NULL,
--   content TEXT NOT NULL,
--   created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
--   updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
-- );

-- Add indexes for better performance
-- CREATE INDEX idx_posts_user_id ON posts(user_id);
-- CREATE INDEX idx_posts_created_at ON posts(created_at DESC);

-- Example: Public posts that anyone can view
-- If you want some posts to be public, add a column:
-- ALTER TABLE posts ADD COLUMN is_public BOOLEAN DEFAULT FALSE;

-- Then modify the SELECT policy:
-- DROP POLICY "Users can view own posts" ON posts;
-- CREATE POLICY "Users can view own posts or public posts"
-- ON posts
-- FOR SELECT
-- USING (auth.uid() = user_id OR is_public = true);

-- Example: Shared posts between users
-- CREATE TABLE post_shares (
--   id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
--   post_id UUID REFERENCES posts(id) ON DELETE CASCADE NOT NULL,
--   shared_with_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
--   created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
--   UNIQUE(post_id, shared_with_user_id)
-- );

-- Enable RLS on post_shares
-- ALTER TABLE post_shares ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view posts shared with them
-- CREATE POLICY "Users can view shared posts"
-- ON posts
-- FOR SELECT
-- USING (
--   auth.uid() = user_id OR
--   EXISTS (
--     SELECT 1 FROM post_shares
--     WHERE post_shares.post_id = posts.id
--     AND post_shares.shared_with_user_id = auth.uid()
--   )
-- );
