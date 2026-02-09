-- Check if there are any RESTRICTIVE policies (not just PERMISSIVE)
SELECT
    tablename,
    policyname,
    cmd,
    permissive,
    roles,
    with_check
FROM pg_policies
WHERE tablename = 'groups'
  AND cmd = 'INSERT'
ORDER BY permissive, policyname;
