# Row Level Security (RLS) Guide

Supabase uses PostgreSQL's Row Level Security to automatically filter queries based on the authenticated user.

## What is RLS?

RLS is database-level security that automatically filters data based on the current user. When a user makes a query, PostgreSQL checks RLS policies and only returns rows they're allowed to see.

## Benefits

✅ **Security at the database level** - Can't be bypassed by forgetting checks in code
✅ **Automatic filtering** - No need to add `WHERE user_id = X` to every query
✅ **Built-in with Supabase Auth** - `auth.uid()` gives you the current user's ID
✅ **Declarative** - Policies are separate from application code

## How It Works with Supabase

```typescript
// Server Action
'use server';

import { createClient } from '@/lib/supabase/server';

export async function getPosts() {
  const supabase = createClient();

  // This query automatically filters by current user via RLS
  const { data } = await supabase.from('posts').select('*');

  // RLS policy ensures only user's own posts are returned
  return data;
}
```

Behind the scenes:
1. User authenticates with Supabase Auth
2. JWT token contains user's ID
3. Supabase automatically sets `auth.uid()` in PostgreSQL session
4. RLS policies use `auth.uid()` to filter results

## Setting Up RLS

### 1. Enable RLS on Table

```sql
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
```

### 2. Create Policies

```sql
-- Allow users to view only their own posts
CREATE POLICY "Users can view own posts"
ON posts
FOR SELECT
USING (auth.uid() = user_id);

-- Allow users to insert posts
CREATE POLICY "Users can insert own posts"
ON posts
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own posts
CREATE POLICY "Users can update own posts"
ON posts
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Allow users to delete their own posts
CREATE POLICY "Users can delete own posts"
ON posts
FOR DELETE
USING (auth.uid() = user_id);
```

## Common Patterns

### Private by Default

```sql
-- Users can only see their own data
CREATE POLICY "Users can view own data"
ON table_name
FOR SELECT
USING (auth.uid() = user_id);
```

### Public Read, Private Write

```sql
-- Anyone can view, but only owner can modify
CREATE POLICY "Anyone can view"
ON posts
FOR SELECT
USING (true);

CREATE POLICY "Owner can update"
ON posts
FOR UPDATE
USING (auth.uid() = user_id);
```

### Public/Private Flag

```sql
-- View own posts or public posts
CREATE POLICY "View own or public posts"
ON posts
FOR SELECT
USING (auth.uid() = user_id OR is_public = true);
```

### Team/Organization Access

```sql
-- View posts from same organization
CREATE POLICY "View team posts"
ON posts
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.org_id = posts.org_id
  )
);
```

### Shared Resources

```sql
-- View posts shared with you
CREATE POLICY "View shared posts"
ON posts
FOR SELECT
USING (
  auth.uid() = user_id OR
  EXISTS (
    SELECT 1 FROM post_shares
    WHERE post_shares.post_id = posts.id
    AND post_shares.shared_with_user_id = auth.uid()
  )
);
```

## Policy Types

### SELECT Policies

Control who can read data:

```sql
CREATE POLICY "policy_name"
ON table_name
FOR SELECT
USING (condition);  -- Must evaluate to true to return row
```

### INSERT Policies

Control who can create data:

```sql
CREATE POLICY "policy_name"
ON table_name
FOR INSERT
WITH CHECK (condition);  -- Must evaluate to true to allow insert
```

### UPDATE Policies

Control who can modify data:

```sql
CREATE POLICY "policy_name"
ON table_name
FOR UPDATE
USING (condition)       -- Must match existing row
WITH CHECK (condition); -- Must be true after update
```

### DELETE Policies

Control who can delete data:

```sql
CREATE POLICY "policy_name"
ON table_name
FOR DELETE
USING (condition);  -- Must match existing row
```

## Testing RLS Policies

### In Supabase SQL Editor

```sql
-- Test as a specific user
SELECT auth.uid(); -- Check current user

-- Test policy
SELECT * FROM posts; -- Should only return user's posts
```

### In Your App

```typescript
// This should only return the current user's posts
const { data } = await supabase.from('posts').select('*');

// Try to access another user's post (should fail)
const { data, error } = await supabase
  .from('posts')
  .select('*')
  .eq('id', 'another-users-post-id');
// error: new row violates row-level security policy
```

## Disabling RLS (for admin operations)

Sometimes you need to bypass RLS (e.g., admin functions):

```typescript
// Use service role key (SERVER-SIDE ONLY)
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // NOT public key
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

// This bypasses RLS
const { data } = await supabaseAdmin.from('posts').select('*');
```

⚠️ **NEVER expose service role key to the client!**

## Debugging RLS

### Check if RLS is enabled

```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';
```

### View existing policies

```sql
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public';
```

### Drop a policy

```sql
DROP POLICY "policy_name" ON table_name;
```

### Disable RLS (not recommended for production)

```sql
ALTER TABLE table_name DISABLE ROW LEVEL SECURITY;
```

## Best Practices

1. **Always enable RLS** - Default deny, explicitly allow
2. **Test policies thoroughly** - Try to access data you shouldn't
3. **Keep policies simple** - Complex policies can hurt performance
4. **Use indexes** - Index columns used in policies (especially `user_id`)
5. **Document policies** - Comment why each policy exists
6. **Least privilege** - Only grant minimum necessary access
7. **Audit regularly** - Review policies as requirements change

## Common Mistakes

❌ **Forgetting to enable RLS**
```sql
-- Table without RLS = anyone can access anything
CREATE TABLE posts (...);
-- Missing: ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
```

❌ **Too permissive policies**
```sql
-- This allows anyone to do anything!
CREATE POLICY "bad_policy" ON posts USING (true);
```

❌ **Forgetting WITH CHECK on INSERT/UPDATE**
```sql
-- Can insert but not enforce ownership
CREATE POLICY "incomplete" ON posts
FOR INSERT
USING (auth.uid() = user_id);
-- Missing: WITH CHECK (auth.uid() = user_id);
```

❌ **Not handling NULL user_id**
```sql
-- What if user_id is NULL?
USING (auth.uid() = user_id)
-- Better: USING (auth.uid() = user_id AND user_id IS NOT NULL)
```

## Resources

- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL RLS Documentation](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [Supabase RLS Examples](https://github.com/supabase/supabase/tree/master/examples)
