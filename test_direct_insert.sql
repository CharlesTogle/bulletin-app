-- Test direct INSERT to see if RLS allows it
-- Run this in Supabase SQL Editor while logged in as the user

-- First, verify auth context
SELECT
    auth.uid() as current_user_id,
    current_setting('request.jwt.claims', true)::json->>'role' as role;

-- Try a direct INSERT (replace with your actual user ID)
INSERT INTO groups (creator_id, name, code, description)
VALUES (
    auth.uid(),  -- This should be your user ID
    'Test Group Direct Insert',
    'TEST1234',
    'Testing if direct INSERT works'
)
RETURNING id, name, creator_id, created_at;

-- If successful, clean up
DELETE FROM groups WHERE code = 'TEST1234';
