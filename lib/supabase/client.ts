import { createBrowserClient } from '@supabase/ssr';

/**
 * Create a Supabase client for Client Components
 *
 * IMPORTANT: This should ONLY be used for:
 * - Authentication UI (login, signup, logout)
 * - Real-time subscriptions (if needed)
 *
 * NEVER use this for direct database queries!
 * ALL database operations must go through Server Actions.
 *
 * @example
 * ```tsx
 * 'use client';
 *
 * import { createClient } from '@/lib/supabase/client';
 *
 * export function LoginForm() {
 *   const supabase = createClient();
 *
 *   async function handleLogin(email: string, password: string) {
 *     const { error } = await supabase.auth.signInWithPassword({
 *       email,
 *       password,
 *     });
 *   }
 *
 *   return <form>...</form>;
 * }
 * ```
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
