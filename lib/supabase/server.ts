import { createServerClient } from '@supabase/ssr';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

/**
 * Create a Supabase client for Server Components and Server Actions
 *
 * This client automatically handles:
 * - Cookie-based session management
 * - JWT verification
 * - RLS policies with auth.uid()
 *
 * IMPORTANT: Only use in server-side code (Server Actions, Route Handlers, Server Components)
 *
 * @example
 * ```typescript
 * 'use server';
 *
 * import { createClient } from '@/lib/supabase/server';
 *
 * export async function getUser() {
 *   const supabase = createClient();
 *   const { data: { user } } = await supabase.auth.getUser();
 *   return user;
 * }
 * ```
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  );
}

/**
 * Create a Supabase admin client with service role privileges
 *
 * IMPORTANT: Only use for admin operations that require bypassing RLS.
 * This client has full database access - use with caution!
 *
 * Common use cases:
 * - Accessing auth.users table
 * - Admin operations that need to bypass RLS
 * - System-level queries
 *
 * @example
 * ```typescript
 * 'use server';
 *
 * import { createAdminClient } from '@/lib/supabase/server';
 *
 * export async function getUserEmails(userIds: string[]) {
 *   const supabase = createAdminClient();
 *   const { data: { users } } = await supabase.auth.admin.listUsers();
 *   return users.filter(u => userIds.includes(u.id));
 * }
 * ```
 */
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
