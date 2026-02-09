import { createServerClient } from '@supabase/ssr';
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
