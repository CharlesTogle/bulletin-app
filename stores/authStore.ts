import { create } from 'zustand';

interface AuthStore {
  email: string;
  password: string;
  isLoading: boolean;
  error: string | null;

  setEmail: (email: string) => void;
  setPassword: (password: string) => void;
  setIsLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  email: '',
  password: '',
  isLoading: false,
  error: null,

  setEmail: (email) => set({ email }),
  setPassword: (password) => set({ password }),
  setIsLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  reset: () => set({ email: '', password: '', isLoading: false, error: null }),
}));
