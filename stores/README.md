# Stores

**IMPORTANT**: Use Zustand for ALL state management in this application. Never use React's `useState` or `useReducer` for component state.

## Why Zustand?

- Centralized state management
- No context providers needed
- Simple API
- TypeScript support
- Shared state across components
- DevTools support

## Creating a New Store

All stores should be created in this `stores/` directory and follow this pattern:

```typescript
import { create } from 'zustand';

interface MyStore {
  // State
  value: string;
  count: number;

  // Actions
  setValue: (value: string) => void;
  increment: () => void;
  reset: () => void;
}

export const useMyStore = create<MyStore>((set) => ({
  // Initial state
  value: '',
  count: 0,

  // Actions
  setValue: (value) => set({ value }),
  increment: () => set((state) => ({ count: state.count + 1 })),
  reset: () => set({ value: '', count: 0 }),
}));
```

## Using a Store in Components

```tsx
'use client';

import { useMyStore } from '@/stores/myStore';

export function MyComponent() {
  // Subscribe to specific state
  const value = useMyStore((state) => state.value);
  const increment = useMyStore((state) => state.increment);

  // Or subscribe to multiple values
  const { count, reset } = useMyStore((state) => ({
    count: state.count,
    reset: state.reset,
  }));

  return (
    <div>
      <p>{value}</p>
      <p>Count: {count}</p>
      <button onClick={increment}>Increment</button>
      <button onClick={reset}>Reset</button>
    </div>
  );
}
```

## Best Practices

1. **Always use Zustand** - Never use React's `useState` or `useReducer`
2. **One store per domain** - Create separate stores for different domains (e.g., `userStore`, `todosStore`, `uiStore`)
3. **Selective subscriptions** - Subscribe to only the state you need to avoid unnecessary re-renders
4. **Export store hook** - Always export the hook (e.g., `useMyStore`), not the store itself
5. **TypeScript** - Always define interfaces for your store
6. **Actions in store** - Keep all state mutations as actions within the store

## Existing Stores

- `supabaseStore` - Manages state for Supabase queries (used by `useSupabase` hook)

## Examples

### Simple Counter Store

```typescript
// stores/counterStore.ts
import { create } from 'zustand';

interface CounterStore {
  count: number;
  increment: () => void;
  decrement: () => void;
  reset: () => void;
}

export const useCounterStore = create<CounterStore>((set) => ({
  count: 0,
  increment: () => set((state) => ({ count: state.count + 1 })),
  decrement: () => set((state) => ({ count: state.count - 1 })),
  reset: () => set({ count: 0 }),
}));
```

### User Store with Async Actions

```typescript
// stores/userStore.ts
import { create } from 'zustand';
import { supabase } from '@/lib/supabase';

interface User {
  id: string;
  email: string;
  name: string;
}

interface UserStore {
  user: User | null;
  isLoading: boolean;
  error: Error | null;
  fetchUser: (id: string) => Promise<void>;
  clearUser: () => void;
}

export const useUserStore = create<UserStore>((set) => ({
  user: null,
  isLoading: false,
  error: null,

  fetchUser: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      set({ user: data, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error : new Error(String(error)),
        isLoading: false
      });
    }
  },

  clearUser: () => set({ user: null, error: null }),
}));
```

### UI Store

```typescript
// stores/uiStore.ts
import { create } from 'zustand';

interface UIStore {
  isSidebarOpen: boolean;
  isModalOpen: boolean;
  modalContent: React.ReactNode | null;
  toggleSidebar: () => void;
  openModal: (content: React.ReactNode) => void;
  closeModal: () => void;
}

export const useUIStore = create<UIStore>((set) => ({
  isSidebarOpen: false,
  isModalOpen: false,
  modalContent: null,

  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  openModal: (content) => set({ isModalOpen: true, modalContent: content }),
  closeModal: () => set({ isModalOpen: false, modalContent: null }),
}));
```

## Migration from useState

If you find yourself writing `useState`, convert it to Zustand:

❌ **Wrong:**
```tsx
const [count, setCount] = useState(0);
```

✅ **Correct:**
```tsx
// Create a store
const useCountStore = create((set) => ({
  count: 0,
  setCount: (count) => set({ count }),
}));

// Use in component
const { count, setCount } = useCountStore();
```

## Remember

**Never use `useState` or `useReducer`. Always use Zustand for ALL state management.**
