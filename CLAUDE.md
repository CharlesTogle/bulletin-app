# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 🚨 CRITICAL: Database Access

**IMPORTANT: ALL database interactions MUST happen in Server Actions. THERE MUST BE NO DATABASE ACCESS WHATSOEVER from client components.**

### The Rules (NON-NEGOTIABLE)

1. **Server Actions ONLY** - ALL database queries (read, write, update, delete) MUST be in Server Actions marked with `'use server'`
2. **NO CLIENT-SIDE DATABASE ACCESS** - Never use Supabase client directly for database queries in client components
3. **Supabase for auth UI ONLY** - Client-side Supabase is ONLY for authentication UI (login, signup, logout)
4. **Actions directory** - All Server Actions go in `actions/` directory
5. **Row Level Security (RLS)** - ALWAYS enable RLS on tables and create appropriate policies
6. **Consistent responses** - Use `{ success: true, data: T } | { success: false, error: string }` pattern
7. **Revalidate paths** - Use `revalidatePath()` after mutations

See `lib/supabase/RLS_GUIDE.md` and `actions/posts.ts` for detailed patterns and examples.

## 🚨 CRITICAL: State Management

**IMPORTANT: Use Zustand for ALL state management. NEVER use React's `useState`, `useReducer`, or any other state management solution.**

- All state must be managed through Zustand stores in the `stores/` directory
- Create a new store for each domain (e.g., `userStore`, `todosStore`, `uiStore`)
- See `stores/README.md` for detailed guidelines and examples

## 🎨 CRITICAL: UI/Design Guidelines

**IMPORTANT: Use Shadcn UI + Lucide React for ALL UI components. Avoid generic Claude/AI assistant website designs.**

### UI Component Library
- **Shadcn UI**: Primary component library (built on Radix UI primitives)
- **Lucide React**: Icon library (use for ALL icons)
- Components are in `components/ui/` directory
- See [Shadcn UI Docs](https://ui.shadcn.com) for available components

### Design Philosophy
- **NO generic Claude-style websites** - Avoid centered gradient heroes, typical AI landing page patterns
- **Practical, grounded designs** - Focus on clarity and usability over flashy effects
- **Unique layouts** - Asymmetric grids, creative card arrangements, non-standard patterns
- **Personality without fluff** - Direct messaging, clear value propositions
- **Shadcn + Lucide combo** - Leverage both libraries together for consistent, accessible UI

### Mobile Responsiveness

**🚨 CRITICAL: ALL pages MUST be mobile responsive. This is non-negotiable.**

- Test all layouts on mobile, tablet, and desktop breakpoints
- Use Tailwind's responsive classes (`sm:`, `md:`, `lg:`, `xl:`)
- Ensure touch targets are at least 44x44px
- Test on actual mobile devices when possible

### Navigation Patterns

**Landing Page (/):**
- Top navigation bar
- Desktop: Logo left, links/buttons right
- Mobile: Logo left, hamburger menu right → opens sidebar menu

**All Other Pages (Dashboard, App Pages):**
- **Desktop**: Persistent sidebar navigation
  - Always visible on larger screens
  - Contains main navigation items
  - Can be collapsible/expandable
- **Mobile**: Hamburger menu → sidebar overlay
  - Hidden by default
  - Opens as overlay/drawer when triggered
  - Closes when clicking outside or on a link

**Implementation:**
- Use Zustand store for sidebar state (open/closed)
- Use Shadcn's Sheet component for mobile sidebar overlay
- Use Lucide React icons (Menu, X) for hamburger/close buttons

### Adding New Components
```bash
# Add Shadcn components as needed
pnpm dlx shadcn@latest add [component-name]

# Example for navigation components
pnpm dlx shadcn@latest add sheet # For mobile sidebar
pnpm dlx shadcn@latest add dialog tabs input
```

## ⚠️ Maintaining This File

**IMPORTANT**: Update this CLAUDE.md file whenever you:
- Create new helper functions or utilities (add to relevant sections with usage examples)
- Add new packages/dependencies (update Key Dependencies section with purpose and usage patterns)
- Create new Zustand stores (add to State Management section)
- Introduce new architectural patterns or abstractions
- Create new directories or restructure the project

This ensures consistency across all future development and helps maintain a single source of truth for the codebase architecture.

## Project Overview

This is a bulletin/bulletin-board application built with Next.js 16 (App Router), TypeScript, Supabase, and Tailwind CSS 4. It uses pnpm as the package manager.

## Development Commands

```bash
# Start development server (http://localhost:3000)
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start

# Run linter
pnpm lint
```

## Architecture

### Tech Stack
- **Framework**: Next.js 16.1.6 with App Router
- **React**: 19.2.3
- **State Management**: Zustand (REQUIRED for ALL state)
- **Database**: Supabase PostgreSQL with RLS - **Server Actions ONLY**
- **Authentication**: Supabase Auth
- **Database Client**: @supabase/ssr (for server), @supabase/supabase-js (for client auth)
- **Styling**: Tailwind CSS 4 with PostCSS
- **UI Components**: Shadcn UI (built on Radix UI primitives)
- **Icons**: Lucide React (REQUIRED for ALL icons)
- **Package Manager**: pnpm

### Project Structure
- `app/` - Next.js App Router pages and layouts
  - `layout.tsx` - Root layout with Geist font configuration
  - `page.tsx` - Landing page (unique design, no generic Claude patterns)
  - `login/page.tsx` - Login page with Supabase auth integration
  - `globals.css` - Global styles and Tailwind imports
- `actions/` - **Server Actions for ALL database operations**
  - `posts.ts` - Example CRUD operations with Supabase + RLS
  - `groups.ts` - Group management (create, join, leave, members)
  - `announcements.ts` - Announcement CRUD with role verification
  - `system-admin.ts` - System admin operations (requires system_admin role)
  - `auth.ts` - Authentication actions (signup, signin, signout)
- `types/` - **TypeScript type definitions**
  - `database.ts` - Database schema types (Group, GroupMember, Post, etc.)
- `components/ui/` - **Shadcn UI components** (use for ALL UI)
- `stores/` - **Zustand stores for ALL client state** (see `stores/README.md`)
  - `supabaseStore.ts` - State management for async operations
  - `authStore.ts` - Auth form state for login/signup pages
- `lib/` - Shared utilities and integrations
  - `lib/supabase/` - **Supabase clients and utilities**
    - `server.ts` - Server-side Supabase client (for Server Actions)
    - `client.ts` - Client-side Supabase client (for auth UI ONLY)
    - `middleware.ts` - Session refresh middleware
    - `RLS_GUIDE.md` - Complete Row Level Security guide
  - `lib/auth/` - **Authentication & authorization helpers**
    - `index.ts` - requireAuth(), getCurrentUser() helpers
    - `permissions.ts` - Role checks (system admin, group roles, announcement permissions)
  - `lib/hooks/` - **Custom React hooks**
    - `useServerAction.ts` - Hook for calling Server Actions with loading states
  - `lib/utils.ts` - Utility functions (cn helper for Tailwind)
- `supabase/migrations/` - SQL migrations and RLS policies
  - `001_create_groups.sql` - Groups schema with RLS
  - `002_create_announcements_system.sql` - Announcements, votes, attachments
  - `003_create_system_admin.sql` - System admin role & statistics views
  - `example_rls_policies.sql` - Example RLS policies
  - `README.md` - Migration documentation
- `middleware.ts` - Next.js middleware for Supabase session refresh
- `public/` - Static assets

### Path Aliases
TypeScript is configured with `@/*` path alias mapping to the root directory. Use `@/stores`, `@/lib`, etc. instead of relative imports.

## State Management with Zustand

**🚨 CRITICAL: ALL state MUST be managed using Zustand. Never use `useState` or `useReducer`.**

### Creating a Store

1. Create a new file in `stores/` directory (e.g., `stores/userStore.ts`)
2. Define the store interface and create the store using `create` from Zustand
3. Export the store hook (e.g., `useUserStore`)
4. Import and use in components with `'use client'`

**Example:**
```typescript
// stores/counterStore.ts
import { create } from 'zustand';

interface CounterStore {
  count: number;
  increment: () => void;
  reset: () => void;
}

export const useCounterStore = create<CounterStore>((set) => ({
  count: 0,
  increment: () => set((state) => ({ count: state.count + 1 })),
  reset: () => set({ count: 0 }),
}));
```

**Usage in components:**
```tsx
'use client';
import { useCounterStore } from '@/stores/counterStore';

export function Counter() {
  const { count, increment } = useCounterStore();
  return <button onClick={increment}>{count}</button>;
}
```

### Existing Stores

- `stores/supabaseStore.ts` - Manages state for all Supabase queries (used internally by `useSupabase` hook)
- `stores/authStore.ts` - Auth form state (email, password, loading, error) for login/signup pages

**Complete documentation:** See `stores/README.md` for detailed patterns, examples, and best practices.

## Database Operations (Server Actions + Supabase)

**🚨 ALL database interactions MUST happen through Server Actions. NO client-side database access.**

### Supabase Setup

**Server-Side Client** (for Server Actions):
```typescript
'use server';

import { createClient } from '@/lib/supabase/server';

export async function getPosts() {
  const supabase = createClient();
  const { data, error } = await supabase.from('posts').select('*');
  // RLS automatically filters by current user
  return { success: true, data };
}
```

**Client-Side Client** (for auth UI ONLY):
```tsx
'use client';

import { createClient } from '@/lib/supabase/client';

export function LoginForm() {
  const supabase = createClient();

  async function handleLogin(email: string, password: string) {
    await supabase.auth.signInWithPassword({ email, password });
  }
  // DO NOT use for database queries!
}
```

**Environment Variables:**
Copy `.env.example` to `.env.local` and configure:
- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anon/public key
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key (for admin operations, SERVER-SIDE ONLY)

### Server Actions with Row Level Security

All database operations go in `actions/` directory:

**Creating a Server Action:**
```typescript
// actions/posts.ts
'use server';

import { createClient } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

export async function getPosts() {
  try {
    await requireAuth(); // Ensure authenticated

    const supabase = createClient();
    const { data, error } = await supabase
      .from('posts')
      .select('*');
      // RLS automatically filters to user's posts

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    return { success: false, error: 'Failed to fetch posts' };
  }
}

export async function createPost(data: { title: string }) {
  try {
    const user = await requireAuth();

    const supabase = createClient();
    const { data: post, error } = await supabase
      .from('posts')
      .insert({ user_id: user.id, title: data.title })
      .select()
      .single();

    if (error) throw error;
    revalidatePath('/posts');
    return { success: true, data: post };
  } catch (error) {
    return { success: false, error: 'Failed to create post' };
  }
}
```

**Row Level Security (RLS) Policies:**
```sql
-- Enable RLS
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- Users can only see their own posts
CREATE POLICY "Users can view own posts"
ON posts FOR SELECT
USING (auth.uid() = user_id);

-- Users can only create posts for themselves
CREATE POLICY "Users can insert own posts"
ON posts FOR INSERT
WITH CHECK (auth.uid() = user_id);
```

**Using Server Actions in Client Components:**
```tsx
'use client';

import { createUser } from '@/actions/users';

export function CreateUserForm() {
  async function handleSubmit(formData: FormData) {
    const result = await createUser({
      name: formData.get('name') as string,
    });

    if (result.success) {
      // Handle success
    } else {
      // Handle error
    }
  }

  return <form action={handleSubmit}>...</form>;
}
```

**Using Server Actions with Loading States:**

Use the `useServerAction` hook (similar to `useSupabase` but for Server Actions):

```tsx
'use client';

import { useEffect } from 'react';
import { useServerAction } from '@/lib/hooks/useServerAction';
import { getUsers } from '@/actions/users';

export function UsersList() {
  const { data, isLoading, error, execute } = useServerAction(getUsers, {
    key: 'users-list',
    onSuccess: (users) => console.log('Loaded:', users),
  });

  useEffect(() => {
    execute();
  }, [execute]);

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return <ul>{data?.map(user => <li key={user.id}>{user.name}</li>)}</ul>;
}
```

**Complete documentation:**
- `lib/supabase/RLS_GUIDE.md` - Complete RLS guide with examples
- `lib/hooks/README.md` - useServerAction hook documentation
- `actions/posts.ts` - CRUD operations with Supabase + RLS
- `actions/auth.ts` - Authentication actions
- `supabase/migrations/example_rls_policies.sql` - Example RLS policies

## Authorization & Permissions

### System Admin Role

**System Admins** are platform-wide administrators with elevated privileges beyond group-level permissions.

**Capabilities:**
- Create and manage groups (with optional admin assignment)
- View system-wide statistics (groups, announcements, users, votes)
- Access time-series data for analytics graphs
- Grant/revoke system admin privileges
- Access all groups regardless of membership

**Permission Checks:**
```typescript
import { requireSystemAdmin, isSystemAdmin } from '@/lib/auth/permissions';

// Require system admin
await requireSystemAdmin(); // Throws if not admin

// Check if current user is system admin
const isAdmin = await isSystemAdmin(); // Returns boolean
```

**Server Actions:**
All system admin operations are in `actions/system-admin.ts`:
- `grantSystemAdmin(userId)` - Grant admin privileges
- `revokeSystemAdmin(userId)` - Revoke admin privileges
- `getSystemAdmins()` - List all system admins
- `createGroupAsAdmin(data)` - Create group with custom admin assignment
- `deleteGroupAsAdmin(groupId)` - Delete any group
- `getSystemStatistics()` - Get platform-wide stats
- `getGroupsTimeline(days)` - Groups created over time
- `getAnnouncementsTimeline(days)` - Announcements created over time
- `getGroupActivityStats()` - Detailed group activity metrics
- `getTopActiveGroups()` - Most active groups by engagement
- `getUserActivityStats()` - User engagement across platform
- `checkSystemAdminStatus()` - Check if current user is system admin

**Database Migration:**
Run `supabase/migrations/003_create_system_admin.sql` to:
- Create `system_roles` table
- Add statistics views for analytics
- Set up RLS policies for system admin access

**Granting First System Admin (SQL):**
```sql
-- Grant system admin to a user by email
INSERT INTO system_roles (user_id, role)
SELECT id, 'system_admin'
FROM auth.users
WHERE email = 'admin@example.com';
```

### Group Roles

**Group-level roles** (separate from system admin):
- **admin**: Manage group settings, members, and all announcements
- **contributor**: Create, edit, and delete own announcements
- **member**: View announcements, vote (upvote/downvote)

**Permission Checks:**
```typescript
import { requireGroupRole, canModifyAnnouncement } from '@/lib/auth/permissions';

// Require specific role
await requireGroupRole(groupId, ['admin', 'contributor']);

// Check announcement permissions
const { canModify, isAuthor, isAdmin } = await canModifyAnnouncement(announcementId);
```

**System Admin Overrides:**
System admins automatically have access to:
- All groups (via `canAccessGroup()`)
- Group management (via `canManageGroup()`)
- View archived announcements
- Delete any group

See `lib/auth/permissions.ts` for complete permission helpers.

### Styling

- **Tailwind CSS 4**: Uses the new PostCSS-based architecture (`@tailwindcss/postcss`)
- **CSS Variables**: Theme configuration in `app/globals.css` with inline `@theme` directive
- **Dark Mode**: Automatic dark mode support via `prefers-color-scheme`
- **Fonts**: Geist Sans and Geist Mono loaded via `next/font/google`

Custom CSS variables:
- `--background`, `--foreground` (auto-adapts to dark mode)
- `--font-geist-sans`, `--font-geist-mono` (font families)

### TypeScript Configuration

- **Strict mode enabled**
- **Target**: ES2017
- **Module Resolution**: bundler
- **React**: Uses new `react-jsx` transform (React 19)
- Path alias: `@/*` maps to root directory

## Client vs Server Components

This is a Next.js App Router project. By default, all components in `app/` are Server Components unless marked with `'use client'`.

**When to use `'use client'`:**
- Components using Zustand stores (always required for state access)
- Components using React hooks (useEffect, useCallback, etc.)
- Components using the Supabase wrapper (`useSupabase` hook)
- Components with browser-only APIs or event handlers

**Note:** Never use `useState` or `useReducer` - use Zustand stores instead.

## Key Dependencies

**IMPORTANT**: When adding new packages, document them here with their purpose and usage patterns.

### State Management
- **zustand** (v5.0.11): **REQUIRED for ALL state management.** Never use `useState` or `useReducer`. Create stores in `stores/` directory.

### UI & Styling
- **shadcn/ui**: Primary UI component library. Built on Radix UI primitives. Add components via CLI: `pnpm dlx shadcn@latest add [component]`
- **lucide-react** (v0.563.0): Icon library. **REQUIRED for ALL icons.** Import from `lucide-react`.
- **tailwindcss** (v4): Utility-first CSS framework. Note: v4 uses new PostCSS architecture.
- **@radix-ui/\***: Installed as dependencies of Shadcn components. Don't import directly; use Shadcn wrappers.

### Backend & Data
- **pg** (v8.18.0): PostgreSQL client (node-postgres). **Only use in Server Actions.** Import from `@/lib/db`.
- **@types/pg**: TypeScript types for pg (dev dependency)

### Framework
- **next** (v16.1.6): React framework with App Router
- **react** (v19.2.3) & **react-dom** (v19.2.3): UI library

## Notes

- **🚨 NEVER access database from client - ONLY Server Actions**
- **🚨 NEVER use `useState` or `useReducer` - ALWAYS use Zustand stores**
- **🎨 NEVER use generic Claude/AI website designs - Be creative and unique**
- **🎨 ALWAYS use Shadcn UI + Lucide React for components and icons**
- **📱 ALL pages MUST be mobile responsive**
- **🧭 Navigation: Landing page = top nav, App pages = sidebar (hamburger on mobile)**
- The project uses React 19 with the new JSX transform
- Tailwind CSS 4 has breaking changes from v3 (uses PostCSS plugin, inline @theme directive)
- Use parameterized queries to prevent SQL injection

## Workflow Reminders

When making changes to the codebase:
1. **Need database access?** Create a Server Action in `actions/` - NEVER access database from client
2. **Need client state?** Create a Zustand store in `stores/` - NEVER use `useState` or `useReducer`
3. **Creating a new page?** Ensure it's mobile responsive and uses correct navigation pattern (sidebar for app pages, top nav for landing)
4. **Adding a helper function?** Update the relevant section with its location, purpose, and usage example
5. **Installing a new package?** Add it to "Key Dependencies" with version, purpose, and when to use it
6. **Creating a new Server Action?** Add it to "Database Operations" section
7. **Creating a new Zustand store?** Add it to "State Management > Existing Stores" section
8. **Creating a new pattern?** Document it in the relevant Architecture subsection
9. **Refactoring project structure?** Update "Project Structure" section

Keeping CLAUDE.md current ensures all future development follows established patterns and conventions.

## Quick Reference

- **Database:** Server Actions ONLY (see `lib/db/README.md` and `actions/example.ts`)
- **Fetch with loading states:** Use `useServerAction` hook (see `lib/hooks/README.md`)
- **Client state:** Zustand only (see `stores/README.md`)
- **UI Components:** Shadcn UI only (`pnpm dlx shadcn@latest add [component]`)
- **Icons:** Lucide React only (import from `lucide-react`)
- **Design:** Avoid generic Claude patterns, be unique and creative
- **Mobile:** ALL pages must be responsive (test on mobile/tablet/desktop)
- **Navigation:** Landing = top nav, App pages = sidebar (hamburger on mobile)
- **Styling:** Tailwind CSS 4
- **Path imports:** Use `@/` alias (e.g., `@/actions/users`, `@/lib/hooks/useServerAction`, `@/stores/myStore`, `@/components/ui/button`)
