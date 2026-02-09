# Supabase Setup Guide

Complete guide to set up Supabase for the Bulletin App.

## Prerequisites

- A Supabase account ([sign up here](https://supabase.com))
- pnpm installed
- The bulletin-app project set up locally

## Step 1: Create Supabase Project

1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Click "New Project"
3. Fill in:
   - **Name**: bulletin-app (or your preferred name)
   - **Database Password**: Choose a strong password (save it!)
   - **Region**: Choose closest to your users
4. Click "Create new project"
5. Wait for project to initialize (~2 minutes)

## Step 2: Get Your Credentials

1. In your Supabase project, go to **Settings** → **API**
2. Copy the following:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **anon public** key (under "Project API keys")
   - **service_role** key (under "Project API keys") - **Keep this secret!**

## Step 3: Configure Environment Variables

1. Copy the example environment file:
   ```bash
   cp .env.example .env.local
   ```

2. Update `.env.local` with your Supabase credentials:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
   ```

3. **IMPORTANT**: Never commit `.env.local` to git!

## Step 4: Create Database Tables

1. Go to **SQL Editor** in your Supabase dashboard
2. Create the posts table:

```sql
-- Create posts table
CREATE TABLE posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Add indexes for performance
CREATE INDEX idx_posts_user_id ON posts(user_id);
CREATE INDEX idx_posts_created_at ON posts(created_at DESC);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_posts_updated_at
    BEFORE UPDATE ON posts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

## Step 5: Enable Row Level Security

1. Still in the SQL Editor, enable RLS and create policies:

```sql
-- Enable RLS on posts table
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
```

2. Click "Run" to execute the SQL

## Step 6: Configure Authentication

1. Go to **Authentication** → **Providers**
2. Enable **Email** provider (it's enabled by default)
3. Configure email templates (optional):
   - Go to **Authentication** → **Email Templates**
   - Customize confirmation, password reset, etc.

### Optional: Configure OAuth Providers

If you want social login (Google, GitHub, etc.):

1. Go to **Authentication** → **Providers**
2. Enable desired provider(s)
3. Configure OAuth credentials (see [Supabase Auth docs](https://supabase.com/docs/guides/auth))

## Step 7: Test the Setup

1. Start your dev server:
   ```bash
   pnpm dev
   ```

2. Create a test user (you can use the Supabase dashboard):
   - Go to **Authentication** → **Users**
   - Click "Add user" → "Create new user"
   - Enter email and password
   - Click "Create user"

3. Test in your app:
   ```typescript
   // Try this in a Server Action
   'use server';

   import { createClient } from '@/lib/supabase/server';

   export async function testConnection() {
     const supabase = createClient();
     const { data, error } = await supabase.from('posts').select('count');
     console.log('Connection test:', { data, error });
   }
   ```

## Step 8: Verify RLS is Working

Test that RLS policies are enforced:

1. In SQL Editor, run:
   ```sql
   SELECT * FROM posts;
   ```
   - This should return ALL posts (you're using service role)

2. Test from your app (as authenticated user):
   ```typescript
   const { data } = await supabase.from('posts').select('*');
   // Should only return current user's posts
   ```

3. Try to access another user's post:
   ```typescript
   const { data, error } = await supabase
     .from('posts')
     .select('*')
     .eq('id', 'another-users-post-id');
   // Should return empty or error
   ```

## Architecture Overview

```
┌─────────────────────────────────────────────────┐
│                  Client Browser                  │
│  ┌────────────────────────────────────────────┐ │
│  │  Client Component                          │ │
│  │  - Auth UI only (login/signup/logout)     │ │
│  │  - Uses createClient() from client.ts     │ │
│  └────────────────────────────────────────────┘ │
│                      ↓                          │
│  ┌────────────────────────────────────────────┐ │
│  │  Server Action                             │ │
│  │  - ALL database operations                 │ │
│  │  - Uses createClient() from server.ts     │ │
│  │  - RLS policies automatically applied     │ │
│  └────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│              Supabase Cloud                      │
│  ┌────────────────────────────────────────────┐ │
│  │  PostgreSQL Database                       │ │
│  │  - Tables with RLS enabled                │ │
│  │  - auth.uid() available in policies       │ │
│  └────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

## Common Issues

### Issue: "relation 'posts' does not exist"

**Solution**: You haven't created the posts table yet. Run the SQL from Step 4.

### Issue: "new row violates row-level security policy"

**Solution**: Your RLS policy is blocking the operation. Check:
- Is the user authenticated? (`await requireAuth()`)
- Does the policy allow this operation?
- Is `user_id` set correctly?

### Issue: "Invalid JWT"

**Solution**:
- Check your environment variables are correct
- Try signing out and back in
- Clear browser cookies

### Issue: Can't see any data

**Solution**:
- Check if RLS is enabled: `SELECT * FROM pg_tables WHERE tablename = 'posts';`
- Verify policies exist: `SELECT * FROM pg_policies WHERE tablename = 'posts';`
- Check if you're authenticated: `const user = await getCurrentUser();`

## Next Steps

1. **Add more tables** - Create tables for comments, likes, etc.
2. **Add RLS policies** - Enable RLS on all new tables
3. **Set up Realtime** - Enable real-time subscriptions if needed
4. **Configure Storage** - Set up file uploads with Supabase Storage
5. **Add indexes** - Optimize queries with appropriate indexes

## Useful SQL Queries

### Check RLS status
```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';
```

### View all policies
```sql
SELECT schemaname, tablename, policyname, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public';
```

### View current user (in SQL Editor - always NULL as you're admin)
```sql
SELECT auth.uid();
```

### Manually test RLS
```sql
-- Set a user context (for testing)
SET request.jwt.claim.sub = 'user-uuid-here';

-- Now queries will use RLS as that user
SELECT * FROM posts;
```

## Resources

- [Supabase Documentation](https://supabase.com/docs)
- [RLS Guide](./lib/supabase/RLS_GUIDE.md)
- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Next.js + Supabase Guide](https://supabase.com/docs/guides/getting-started/quickstarts/nextjs)

## Support

If you encounter issues:
1. Check the [Supabase Discord](https://discord.supabase.com)
2. Review [Supabase GitHub Discussions](https://github.com/supabase/supabase/discussions)
3. Check this project's `lib/supabase/RLS_GUIDE.md`
