-- Check RLS policies on group_members table
SELECT
    policyname,
    cmd,
    roles,
    with_check as "WITH CHECK expression"
FROM pg_policies
WHERE tablename = 'group_members'
  AND cmd = 'INSERT'
ORDER BY policyname;
