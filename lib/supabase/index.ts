// Client-side Supabase (for auth UI only)
export { createClient as createBrowserClient } from './client';

// Server-side Supabase (for Server Actions)
export { createClient as createServerClient } from './server';

// Legacy hooks (deprecated - use useServerAction instead)
export { useSupabase } from './useSupabase';
export type { UseSupabaseOptions, UseSupabaseReturn } from './types';
