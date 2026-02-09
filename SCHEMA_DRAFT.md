# Bulletin App - Schema Draft

**Status:** 🚧 DRAFT - Do not run migrations yet

## Group Roles & Permissions

### Role Hierarchy

```
┌─────────────────────────────────────────────┐
│  Admin                                      │
│  • Full group control                       │
│  • Create/edit/delete announcements         │
│  • Manage members (add, remove, promote)    │
│  • Update group settings                    │
│  • Delete group                             │
│  • Upvote/downvote announcements            │
└─────────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────────┐
│  Contributor                                │
│  • Create announcements                     │
│  • Edit own announcements                   │
│  • Update member roles                      │
│  • Upvote/downvote announcements            │
│  • View group content                       │
└─────────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────────┐
│  Member                                     │
│  • View announcements                       │
│  • Upvote announcements                     │
│  • Downvote announcements                   │
│  • View other members                       │
│                                             │
│  ❌ NO commenting                           │
│  ❌ NO announcement creation                │
└─────────────────────────────────────────────┘
```

## Permission Matrix

| Action | Admin | Contributor | Member |
|--------|:-----:|:-----------:|:------:|
| **Announcements** |
| Create announcements | ✅ | ✅ | ❌ |
| Edit own announcements | ✅ | ✅ | ❌ |
| Edit others' announcements | ✅ | ❌ | ❌ |
| Delete own announcements | ✅ | ✅ | ❌ |
| Delete others' announcements | ✅ | ❌ | ❌ |
| View announcements | ✅ | ✅ | ✅ |
| **Voting** |
| Upvote announcements | ✅ | ✅ | ✅ |
| Downvote announcements | ✅ | ✅ | ✅ |
| Remove own vote | ✅ | ✅ | ✅ |
| **Comments** |
| Comment on announcements | ❌ | ❌ | ❌ |
| **Group Management** |
| Update group settings | ✅ | ❌ | ❌ |
| Delete group | ✅ | ❌ | ❌ |
| **Member Management** |
| Add members | ✅ | ❌ | ❌ |
| Remove members | ✅ | ❌ | ❌ |
| Promote to contributor | ✅ | ✅ | ❌ |
| Promote to admin | ✅ | ❌ | ❌ |
| Demote members | ✅ | ✅ | ❌ |
| Leave group | ✅ | ✅ | ✅ |

## ✅ Finalized Features

1. ✅ Vote changing/removal - Users can change upvote↔downvote or remove vote
2. ✅ Edit announcements - Contributors can edit after posting
3. ✅ Markdown support - Rich text with react-markdown + MDEditor
4. ✅ Attachments - Supabase Storage integration
5. ✅ Categories & Tags - Organization system
6. ✅ Deadlines - UTC timestamps for time-sensitive announcements
7. ✅ No limits - Unlimited announcements per group/user

## Database Schema (Complete)

### Existing Tables

#### 1. `groups`
```sql
CREATE TABLE groups (
  id UUID PRIMARY KEY,
  creator_id UUID REFERENCES auth.users(id),
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 2. `group_members`
```sql
CREATE TABLE group_members (
  id UUID PRIMARY KEY,
  group_id UUID REFERENCES groups(id),
  user_id UUID REFERENCES auth.users(id),
  role TEXT CHECK (role IN ('admin', 'contributor', 'member')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(group_id, user_id)
);
```

### Upcoming Tables (To Be Designed)

#### 3. `announcements` (TBD)
```sql
-- Draft structure
CREATE TABLE announcements (
  id UUID PRIMARY KEY,
  group_id UUID REFERENCES groups(id),
  author_id UUID REFERENCES auth.users(id),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 4. `votes` (TBD)
```sql
-- Draft structure
CREATE TABLE votes (
  id UUID PRIMARY KEY,
  announcement_id UUID REFERENCES announcements(id),
  user_id UUID REFERENCES auth.users(id),
  vote_type TEXT CHECK (vote_type IN ('upvote', 'downvote')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(announcement_id, user_id) -- One vote per user per announcement
);
```

## Notes

- ❌ **NO comment system** - Members can only vote
- ✅ **Voting system** - Upvote/downvote only
- ✅ **Contributors can create** - Announcement creation privilege
- ✅ **Simple permissions** - Clear role hierarchy

## Next Steps

1. ⏳ Finalize announcement table schema
2. ⏳ Finalize votes table schema
3. ⏳ Define RLS policies for announcements
4. ⏳ Define RLS policies for votes
5. ⏳ Create migration files
6. ⏳ Run all migrations together

## Questions to Resolve

- [ ] Can users change their vote? (upvote → downvote)
- [ ] Can users remove their vote entirely?
- [ ] Should announcements have categories/tags?
- [ ] Should announcements support rich text/markdown?
- [ ] Should announcements have attachments/images?
- [ ] Should there be a max number of announcements per group?
- [ ] Can contributors edit announcements after posting?
- [ ] Should there be announcement moderation/approval?
