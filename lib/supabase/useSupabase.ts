'use client';

import { useCallback, useId } from 'react';
import { useSupabaseStore } from '@/stores/supabaseStore';
import type { UseSupabaseOptions, UseSupabaseReturn } from './types';

/**
 * A centralized Supabase wrapper hook that manages loading states using Zustand
 * and provides callback functions
 *
 * @example
 * ```tsx
 * const { data, isLoading, error, execute } = useSupabase<User[]>({
 *   key: 'users-list', // Optional: provide a key for shared state
 *   onSuccess: (users) => console.log('Users loaded:', users),
 *   onError: (error) => console.error('Failed to load users:', error)
 * });
 *
 * const fetchUsers = async () => {
 *   const { data, error } = await supabase.from('users').select('*');
 *   if (error) throw error;
 *   return data;
 * };
 *
 * useEffect(() => {
 *   execute(fetchUsers);
 * }, []);
 * ```
 */
export function useSupabase<T>(
  options: UseSupabaseOptions<T> = {}
): UseSupabaseReturn<T> {
  const { key: providedKey, onSuccess, onError, onSettled } = options;

  // Generate a unique key if not provided
  const autoKey = useId();
  const key = providedKey || autoKey;

  // Get store actions
  const setLoading = useSupabaseStore((state) => state.setLoading);
  const setData = useSupabaseStore((state) => state.setData);
  const setError = useSupabaseStore((state) => state.setError);
  const resetState = useSupabaseStore((state) => state.reset);

  // Get current state for this instance
  const instance = useSupabaseStore((state) => state.instances[key]);
  const data = (instance?.data as T) ?? null;
  const error = instance?.error ?? null;
  const isLoading = instance?.isLoading ?? false;

  const execute = useCallback(
    async (asyncFunction: () => Promise<T>) => {
      try {
        setLoading(key, true);
        setError(key, null);

        const result = await asyncFunction();
        setData<T>(key, result);

        if (onSuccess) {
          onSuccess(result);
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(key, error);

        if (onError) {
          onError(error);
        }
      } finally {
        setLoading(key, false);

        if (onSettled) {
          onSettled();
        }
      }
    },
    [key, setLoading, setData, setError, onSuccess, onError, onSettled]
  );

  const reset = useCallback(() => {
    resetState(key);
  }, [key, resetState]);

  return {
    data,
    error,
    isLoading,
    execute,
    reset,
  };
}
