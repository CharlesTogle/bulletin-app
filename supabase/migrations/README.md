# Database Migrations

SQL migrations for the Bulletin App database schema.

## Migration Files

### Migration Order

Run migrations in this order:
1. `001_create_groups.sql` - Groups and membership system
2. `002_create_announcements_system.sql` - Announcements, votes, attachments (Not yet run)
3. `003_create_system_admin.sql` - System admin role and statistics (Not yet run)

### `001_create_groups.sql`

**Creates the groups system with the following tables:**

#### Tables

1. **`groups`** - Main groups table
   - `id` (UUID, PK) - Unique group identifier
   - `creator_id` (UUID, FK → auth.users) - User who created the group
   - `name` (TEXT) - Group name (3-100 characters)
   - `code` (TEXT, UNIQUE) - Unique join code (6-12 uppercase alphanumeric)
   - `description` (TEXT, nullable) - Optional group description
   - `created_at` (TIMESTAMPTZ) - When group was created (UTC)
   - `updated_at` (TIMESTAMPTZ) - When group was last updated (UTC)

2. **`group_members`** - Junction table for group membership
   - `id` (UUID, PK) - Unique membership identifier
   - `group_id` (UUID, FK → groups) - Group reference
   - `user_id` (UUID, FK → auth.users) - User reference
   - `role` (TEXT) - Member role: `admin`, `contributor`, or `member`
     - **admin**: Full control over group
     - **contributor**: Can create announcements
     - **member**: Can view, upvote, and downvote announcements only
   - `joined_at` (TIMESTAMPTZ) - When user joined (UTC)
   - **Unique constraint**: One membership per user per group

#### Features

✅ **Automatic Group Code Generation** - `generate_group_code()` function creates unique codes
✅ **Auto-add Creator as Admin** - Trigger automatically adds group creator as admin
✅ **Updated_at Trigger** - Automatically updates `updated_at` on changes
✅ **Row Level Security** - Complete RLS policies for secure access
✅ **Member Roles** - Admin, Contributor, and Member roles with different permissions
✅ **Stats View** - `groups_with_stats` view includes member counts

#### RLS Policies

**Groups:**
- ✅ Members can view their groups
- ✅ Authenticated users can create groups
- ✅ Only admins can update groups
- ✅ Only admins can delete groups

**Group Members:**
- ✅ Members can view other members in their groups
- ✅ Users can join groups (as member)
- ✅ Admins can add members with any role
- ✅ Admins/contributors can update member roles
- ✅ Users can leave groups, admins can remove members

## Running Migrations

### Option 1: Supabase Dashboard (Recommended)

1. Go to **SQL Editor** in your Supabase dashboard
2. Copy the contents of the migration file
3. Paste into the SQL Editor
4. Click **Run**

### Option 2: Supabase CLI

```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link to your project
supabase link --project-ref your-project-ref

# Run migrations
supabase db push
```

## Usage Examples

### Create a Group

```typescript
import { createGroup } from '@/actions/groups';

const result = await createGroup({
  name: 'My Awesome Group',
  description: 'A group for awesome people',
});

if (result.success) {
  console.log('Group created with code:', result.data.code);
}
```

### Join a Group

```typescript
import { joinGroup } from '@/actions/groups';

const result = await joinGroup('ABC12345');

if (result.success) {
  console.log('Joined group:', result.data.name);
}
```

### Get User's Groups

```typescript
import { getMyGroups } from '@/actions/groups';

const result = await getMyGroups();

if (result.success) {
  result.data.forEach((group) => {
    console.log(`${group.name} - ${group.member_count} members`);
  });
}
```

### Update Member Role

```typescript
import { updateMemberRole } from '@/actions/groups';

const result = await updateMemberRole(
  'group-id',
  'user-id',
  'contributor'
);
```

## Testing the Migration

After running the migration, test it with these SQL queries:

### 1. Check Tables Exist

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('groups', 'group_members');
```

### 2. Check RLS is Enabled

```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('groups', 'group_members');
```

### 3. Test Code Generation

```sql
SELECT generate_group_code(8);
-- Should return a unique 8-character code
```

### 4. Create a Test Group

```sql
-- Replace 'your-user-id' with your actual user ID from auth.users
INSERT INTO groups (creator_id, name, code, description)
VALUES (
  'your-user-id',
  'Test Group',
  generate_group_code(8),
  'Testing group creation'
)
RETURNING *;
```

### 5. Check Creator is Admin

```sql
-- Should show the creator as an admin
SELECT * FROM group_members
WHERE group_id = 'group-id-from-above';
```

## Rollback

If you need to rollback this migration:

```sql
-- Drop tables (cascade will remove all data and related objects)
DROP TABLE IF EXISTS group_members CASCADE;
DROP TABLE IF EXISTS groups CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS generate_group_code(INTEGER);
DROP FUNCTION IF EXISTS add_creator_as_admin();
DROP FUNCTION IF EXISTS update_updated_at_column();

-- Drop view
DROP VIEW IF EXISTS groups_with_stats;
```

⚠️ **WARNING**: This will delete ALL group data!

## Next Steps

After running this migration:

1. ✅ Create Server Actions (already created in `actions/groups.ts`)
2. ✅ Define TypeScript types (already created in `types/database.ts`)
3. 🔲 Create UI components for group management
4. 🔲 Add posts system that links to groups
5. 🔲 Add comments on posts
6. 🔲 Add notifications for group activity

## Common Issues

### Issue: "relation 'groups' already exists"

**Solution**: The migration has already been run. Skip this migration or drop the tables first.

### Issue: "function generate_group_code() does not exist"

**Solution**: Run the entire migration file, not just parts of it.

### Issue: "permission denied for table groups"

**Solution**: Make sure RLS policies are correctly created and you're authenticated.

### Issue: Group codes are not unique

**Solution**: The `generate_group_code()` function checks for uniqueness. If you're manually inserting codes, make sure they're unique.

## Schema Diagram

```
┌─────────────────────────────────────┐
│            auth.users               │
│  (Supabase built-in)                │
│  - id (UUID)                        │
│  - email                            │
│  - ...                              │
└─────────────────────────────────────┘
         ↑                    ↑
         │                    │
         │ creator_id         │ user_id
         │                    │
┌────────┴──────────┐   ┌────┴────────────────┐
│      groups       │   │   group_members     │
│  - id             │←──│  - group_id         │
│  - creator_id     │   │  - user_id          │
│  - name           │   │  - role             │
│  - code (unique)  │   │  - joined_at        │
│  - description    │   └─────────────────────┘
│  - created_at     │
│  - updated_at     │
└───────────────────┘
```

### `002_create_announcements_system.sql`

**Creates the complete announcements ecosystem:**

#### Tables

1. **`categories`** - Announcement categories
   - Colored labels for organizing announcements
   - Lucide icon support

2. **`tags`** - Flexible tagging system
   - For cross-category organization

3. **`announcements`** - Main announcements table
   - Rich markdown content (up to 50,000 chars)
   - Optional deadline field
   - Pin and archive functionality
   - Auto-tracked upvote/downvote counts

4. **`announcement_tags`** - Many-to-many tag relationships

5. **`votes`** - User voting system
   - Upvote or downvote
   - Can change or remove vote
   - Auto-updates announcement vote counts via trigger

6. **`attachments`** - File attachments
   - Links to Supabase Storage
   - Supports any file type

#### Storage Setup

After running the migration, create a storage bucket in Supabase Dashboard:

1. Go to **Storage** → **New Bucket**
2. Bucket name: `attachments`
3. Public: No (private bucket)
4. Run the storage RLS policies from the migration file

#### Features

✅ **Markdown Support** - Rich text with GFM support
✅ **Voting System** - Upvote/downvote with auto-count updates
✅ **Categories & Tags** - Flexible organization
✅ **Deadlines** - Optional due dates (UTC timestamps)
✅ **Attachments** - File storage via Supabase Storage
✅ **Pin/Archive** - Admin-only features
✅ **Complete RLS** - Secure access control

### `003_create_system_admin.sql`

**Creates the System Admin role and statistics views:**

#### Tables

1. **`system_roles`** - System-wide administrative roles
   - Currently supports `system_admin` role
   - Tracks who granted the role and when

#### Views (Statistics)

1. **`system_statistics`** - Overall platform metrics
   - Total groups, announcements, users, votes, attachments

2. **`groups_created_timeline`** - Time-series data for groups

3. **`announcements_created_timeline`** - Time-series data for announcements

4. **`group_activity_stats`** - Detailed per-group metrics

5. **`top_active_groups`** - Top 20 groups by engagement

6. **`user_activity_stats`** - Per-user engagement metrics

#### Features

✅ **System Admin Role** - Platform-wide privileges
✅ **Statistics Views** - Pre-aggregated analytics
✅ **Helper Functions** - `is_system_admin()`, `auth.is_system_admin()`
✅ **Complete RLS** - Only system admins can access statistics

#### Granting the First System Admin

After running the migration, grant system admin to your user:

```sql
-- Find your user ID
SELECT id, email FROM auth.users WHERE email = 'your-email@example.com';

-- Grant system admin role
INSERT INTO system_roles (user_id, role, granted_by)
VALUES (
  'your-user-id-here',  -- Replace with your user ID from above
  'system_admin',
  NULL  -- NULL for the first admin (bootstrap)
);
```

**Alternatively, grant by email directly:**

```sql
INSERT INTO system_roles (user_id, role, granted_by)
SELECT id, 'system_admin', NULL
FROM auth.users
WHERE email = 'your-email@example.com';
```

After granting, you can use the Server Actions in `actions/system-admin.ts` to manage additional system admins from the UI.

## Resources

- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL Triggers](https://www.postgresql.org/docs/current/triggers.html)
- [Group Actions Documentation](../../actions/groups.ts)
- [Announcement Actions Documentation](../../actions/announcements.ts)
- [System Admin Actions Documentation](../../actions/system-admin.ts)
