import { create } from 'zustand';

interface SupabaseState<T> {
  data: T | null;
  error: Error | null;
  isLoading: boolean;
}

interface SupabaseStore {
  // Store state for each instance by a unique key
  instances: Record<string, SupabaseState<any>>;

  // Actions
  setLoading: (key: string, isLoading: boolean) => void;
  setData: <T>(key: string, data: T | null) => void;
  setError: (key: string, error: Error | null) => void;
  reset: (key: string) => void;
  resetAll: () => void;
}

export const useSupabaseStore = create<SupabaseStore>((set) => ({
  instances: {},

  setLoading: (key, isLoading) =>
    set((state) => ({
      instances: {
        ...state.instances,
        [key]: {
          ...state.instances[key],
          data: state.instances[key]?.data ?? null,
          error: state.instances[key]?.error ?? null,
          isLoading,
        },
      },
    })),

  setData: (key, data) =>
    set((state) => ({
      instances: {
        ...state.instances,
        [key]: {
          ...state.instances[key],
          data,
          error: null,
          isLoading: state.instances[key]?.isLoading ?? false,
        },
      },
    })),

  setError: (key, error) =>
    set((state) => ({
      instances: {
        ...state.instances,
        [key]: {
          ...state.instances[key],
          data: state.instances[key]?.data ?? null,
          error,
          isLoading: state.instances[key]?.isLoading ?? false,
        },
      },
    })),

  reset: (key) =>
    set((state) => ({
      instances: {
        ...state.instances,
        [key]: {
          data: null,
          error: null,
          isLoading: false,
        },
      },
    })),

  resetAll: () => set({ instances: {} }),
}));
