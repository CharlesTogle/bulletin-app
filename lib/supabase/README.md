# Supabase Wrapper

A centralized Supabase wrapper with Zustand-powered state management and callback support.

## Features

- **Zustand-powered state management** - All state managed through Zustand store
- **Shared state support** - Optional keys allow state sharing across components
- Centralized loading state management
- Success, error, and settled callbacks
- TypeScript support
- Easy to use with any Supabase query
- Reset functionality

## Setup

1. Copy `.env.example` to `.env.local` and add your Supabase credentials:

```bash
cp .env.example .env.local
```

2. Update the values in `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

## Usage

### Basic Example

```tsx
'use client';

import { useEffect } from 'react';
import { supabase, useSupabase } from '@/lib/supabase';

interface User {
  id: string;
  email: string;
  name: string;
}

export function UsersList() {
  const { data, isLoading, error, execute } = useSupabase<User[]>({
    key: 'users-list', // Optional: share state with same key across components
    onSuccess: (users) => {
      console.log('Users loaded:', users);
    },
    onError: (error) => {
      console.error('Error loading users:', error);
    },
    onSettled: () => {
      console.log('Request completed');
    },
  });

  useEffect(() => {
    const fetchUsers = async () => {
      const { data, error } = await supabase.from('users').select('*');
      if (error) throw error;
      return data;
    };

    execute(fetchUsers);
  }, [execute]);

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <ul>
      {data?.map((user) => (
        <li key={user.id}>{user.name}</li>
      ))}
    </ul>
  );
}
```

### Create/Update Example

```tsx
const { isLoading: isCreating, execute: createUser } = useSupabase<User>({
  onSuccess: (newUser) => {
    console.log('User created:', newUser);
    // Optionally refetch the list
  },
  onError: (error) => {
    alert('Failed to create user: ' + error.message);
  },
});

const handleCreateUser = async (name: string, email: string) => {
  await createUser(async () => {
    const { data, error } = await supabase
      .from('users')
      .insert({ name, email })
      .select()
      .single();

    if (error) throw error;
    return data;
  });
};
```

### Multiple Operations

```tsx
function MyComponent() {
  // Fetching data
  const {
    data: users,
    isLoading: isFetching,
    execute: fetchUsers,
  } = useSupabase<User[]>();

  // Creating data
  const {
    isLoading: isCreating,
    execute: createUser,
  } = useSupabase<User>();

  // Updating data
  const {
    isLoading: isUpdating,
    execute: updateUser,
  } = useSupabase<User>();

  // Deleting data
  const {
    isLoading: isDeleting,
    execute: deleteUser,
  } = useSupabase<void>();

  // Now you have separate loading states for each operation!
}
```

### Reset State

```tsx
const { data, isLoading, error, execute, reset } = useSupabase<User[]>();

// Reset the state (clear data, error, and loading state)
const handleReset = () => {
  reset();
};
```

## API Reference

### `useSupabase<T>(options?)`

#### Parameters

- `options` (optional): Configuration object
  - `key?: string` - Optional unique key for this instance. Allows state sharing across components with the same key. Auto-generated if not provided.
  - `onSuccess?: (data: T) => void` - Called when the operation succeeds
  - `onError?: (error: Error) => void` - Called when the operation fails
  - `onSettled?: () => void` - Called when the operation completes (success or error)

#### Returns

- `data: T | null` - The response data from the operation
- `error: Error | null` - Any error that occurred
- `isLoading: boolean` - Whether the operation is in progress
- `execute: (asyncFunction: () => Promise<T>) => Promise<void>` - Function to trigger the operation
- `reset: () => void` - Function to reset the state

## Advanced Patterns

### Dependent Queries

```tsx
const { data: user, execute: fetchUser } = useSupabase<User>();

const { data: posts, execute: fetchUserPosts } = useSupabase<Post[]>({
  onSuccess: (posts) => {
    console.log(`User has ${posts.length} posts`);
  },
});

useEffect(() => {
  const loadUserData = async () => {
    // First fetch the user
    await fetchUser(async () => {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();
      if (error) throw error;
      return data;
    });

    // Then fetch their posts
    await fetchUserPosts(async () => {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('user_id', userId);
      if (error) throw error;
      return data;
    });
  };

  loadUserData();
}, [userId]);
```

### Global Loading State

You can use multiple instances together to track overall loading:

```tsx
const { isLoading: isLoadingUsers, execute: fetchUsers } = useSupabase<User[]>();
const { isLoading: isLoadingPosts, execute: fetchPosts } = useSupabase<Post[]>();

const isLoading = isLoadingUsers || isLoadingPosts;
```

## Type Safety

The wrapper is fully typed. Pass your expected return type as a generic:

```tsx
interface Product {
  id: number;
  name: string;
  price: number;
}

const { data } = useSupabase<Product[]>(); // data is Product[] | null
const { data: single } = useSupabase<Product>(); // data is Product | null
```

## Shared State Across Components

Use the `key` parameter to share state between multiple components:

```tsx
// Component A
function ComponentA() {
  const { data, isLoading, execute } = useSupabase<User[]>({
    key: 'shared-users', // Same key
  });

  // Both components will see the same state!
}

// Component B
function ComponentB() {
  const { data, isLoading } = useSupabase<User[]>({
    key: 'shared-users', // Same key
  });

  // Will show the same data and loading state as Component A
}
```

## Under the Hood

This hook uses Zustand (`stores/supabaseStore.ts`) for state management, ensuring consistent state across the application. All state changes are managed through Zustand actions.
```
