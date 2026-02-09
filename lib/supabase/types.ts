export interface UseSupabaseOptions<T> {
  key?: string; // Optional unique key for this instance (auto-generated if not provided)
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
  onSettled?: () => void;
}

export interface UseSupabaseReturn<T> {
  data: T | null;
  error: Error | null;
  isLoading: boolean;
  execute: (...args: any[]) => Promise<void>;
  reset: () => void;
}
