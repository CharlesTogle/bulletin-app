'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

/**
 * Get the current authenticated user
 *
 * Returns null if not authenticated
 */
export async function getCurrentUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/**
 * Require authentication
 *
 * Throws an error if user is not authenticated
 * Use this in Server Actions that require auth
 *
 * @example
 * ```typescript
 * 'use server';
 *
 * import { requireAuth } from '@/lib/auth';
 *
 * export async function createPost(data: PostData) {
 *   const user = await requireAuth();
 *   // user.id is guaranteed to exist here
 * }
 * ```
 */
export async function requireAuth() {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error('Authentication required');
  }

  return user;
}

/**
 * Require authentication and redirect if not authenticated
 *
 * Use this in Server Components
 */
export async function requireAuthRedirect(redirectTo: string = '/login') {
  const user = await getCurrentUser();

  if (!user) {
    redirect(redirectTo);
  }

  return user;
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  const user = await getCurrentUser();
  return !!user;
}
