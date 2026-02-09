-- Check the exact definition of the INSERT policy on groups table
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual as "USING expression",
    with_check as "WITH CHECK expression"
FROM pg_policies
WHERE tablename = 'groups'
  AND cmd = 'INSERT'
ORDER BY policyname;
