'use client';

import { useCallback } from 'react';
import { create } from 'zustand';

// Store for managing server action states
interface ServerActionState {
  states: Record<
    string,
    {
      isLoading: boolean;
      error: string | null;
      data: any;
    }
  >;
  setLoading: (key: string, isLoading: boolean) => void;
  setData: (key: string, data: any) => void;
  setError: (key: string, error: string | null) => void;
  reset: (key: string) => void;
}

const useServerActionStore = create<ServerActionState>((set) => ({
  states: {},

  setLoading: (key, isLoading) =>
    set((state) => ({
      states: {
        ...state.states,
        [key]: {
          ...state.states[key],
          data: state.states[key]?.data ?? null,
          error: state.states[key]?.error ?? null,
          isLoading,
        },
      },
    })),

  setData: (key, data) =>
    set((state) => ({
      states: {
        ...state.states,
        [key]: {
          ...state.states[key],
          data,
          error: null,
          isLoading: state.states[key]?.isLoading ?? false,
        },
      },
    })),

  setError: (key, error) =>
    set((state) => ({
      states: {
        ...state.states,
        [key]: {
          ...state.states[key],
          data: state.states[key]?.data ?? null,
          error,
          isLoading: state.states[key]?.isLoading ?? false,
        },
      },
    })),

  reset: (key) =>
    set((state) => ({
      states: {
        ...state.states,
        [key]: {
          data: null,
          error: null,
          isLoading: false,
        },
      },
    })),
}));

// Response type from Server Actions
type ActionResponse<T> =
  | { success: true; data: T }
  | { success: false; error: string };

interface UseServerActionOptions<T> {
  key?: string; // Optional key for shared state
  onSuccess?: (data: T) => void;
  onError?: (error: string) => void;
  onSettled?: () => void;
}

interface UseServerActionReturn<T> {
  data: T | null;
  error: string | null;
  isLoading: boolean;
  execute: () => Promise<void>;
  reset: () => void;
}

/**
 * Hook for calling Server Actions with loading/error states managed by Zustand
 *
 * @example
 * ```tsx
 * 'use client';
 *
 * import { useServerAction } from '@/lib/hooks/useServerAction';
 * import { getUsers } from '@/actions/users';
 *
 * export function UsersList() {
 *   const { data, isLoading, error, execute } = useServerAction(getUsers, {
 *     key: 'users-list',
 *     onSuccess: (users) => console.log('Loaded:', users),
 *     onError: (error) => console.error('Error:', error),
 *   });
 *
 *   useEffect(() => {
 *     execute();
 *   }, [execute]);
 *
 *   if (isLoading) return <div>Loading...</div>;
 *   if (error) return <div>Error: {error}</div>;
 *
 *   return (
 *     <ul>
 *       {data?.map((user) => (
 *         <li key={user.id}>{user.name}</li>
 *       ))}
 *     </ul>
 *   );
 * }
 * ```
 */
export function useServerAction<T>(
  serverAction: () => Promise<ActionResponse<T>>,
  options: UseServerActionOptions<T> = {}
): UseServerActionReturn<T> {
  const { key = 'default', onSuccess, onError, onSettled } = options;

  // Get store actions
  const setLoading = useServerActionStore((state) => state.setLoading);
  const setData = useServerActionStore((state) => state.setData);
  const setError = useServerActionStore((state) => state.setError);
  const resetState = useServerActionStore((state) => state.reset);

  // Get current state for this key
  const state = useServerActionStore((state) => state.states[key]);
  const data = (state?.data as T) ?? null;
  const error = state?.error ?? null;
  const isLoading = state?.isLoading ?? false;

  const execute = useCallback(async () => {
    try {
      setLoading(key, true);
      setError(key, null);

      const result = await serverAction();

      if (result.success) {
        setData(key, result.data);
        if (onSuccess) {
          onSuccess(result.data);
        }
      } else {
        setError(key, result.error);
        if (onError) {
          onError(result.error);
        }
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(key, errorMessage);
      if (onError) {
        onError(errorMessage);
      }
    } finally {
      setLoading(key, false);
      if (onSettled) {
        onSettled();
      }
    }
  }, [key, serverAction, setLoading, setData, setError, onSuccess, onError, onSettled]);

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

/**
 * Hook for calling Server Actions with parameters
 *
 * @example
 * ```tsx
 * 'use client';
 *
 * import { useServerActionWithParams } from '@/lib/hooks/useServerAction';
 * import { getUser } from '@/actions/users';
 *
 * export function UserProfile({ userId }: { userId: number }) {
 *   const { data, isLoading, error, execute } = useServerActionWithParams(
 *     getUser,
 *     {
 *       key: `user-${userId}`,
 *     }
 *   );
 *
 *   useEffect(() => {
 *     execute(userId);
 *   }, [userId, execute]);
 *
 *   if (isLoading) return <div>Loading...</div>;
 *   if (error) return <div>Error: {error}</div>;
 *
 *   return <div>{data?.name}</div>;
 * }
 * ```
 */
export function useServerActionWithParams<TParams extends any[], TResult>(
  serverAction: (...args: TParams) => Promise<ActionResponse<TResult>>,
  options: UseServerActionOptions<TResult> = {}
): Omit<UseServerActionReturn<TResult>, 'execute'> & {
  execute: (...args: TParams) => Promise<void>;
} {
  const { key = 'default', onSuccess, onError, onSettled } = options;

  const setLoading = useServerActionStore((state) => state.setLoading);
  const setData = useServerActionStore((state) => state.setData);
  const setError = useServerActionStore((state) => state.setError);
  const resetState = useServerActionStore((state) => state.reset);

  const state = useServerActionStore((state) => state.states[key]);
  const data = (state?.data as TResult) ?? null;
  const error = state?.error ?? null;
  const isLoading = state?.isLoading ?? false;

  const execute = useCallback(
    async (...args: TParams) => {
      try {
        setLoading(key, true);
        setError(key, null);

        const result = await serverAction(...args);

        if (result.success) {
          setData(key, result.data);
          if (onSuccess) {
            onSuccess(result.data);
          }
        } else {
          setError(key, result.error);
          if (onError) {
            onError(result.error);
          }
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'An unexpected error occurred';
        setError(key, errorMessage);
        if (onError) {
          onError(errorMessage);
        }
      } finally {
        setLoading(key, false);
        if (onSettled) {
          onSettled();
        }
      }
    },
    [key, serverAction, setLoading, setData, setError, onSuccess, onError, onSettled]
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
