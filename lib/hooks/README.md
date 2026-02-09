# React Hooks

Custom hooks for the application.

## useServerAction

A hook for calling Server Actions with loading/error state management using Zustand.

**Similar to `useSupabase` but for Server Actions.**

### Features

- Loading, error, and data states
- Success/error/settled callbacks
- Zustand-powered state management
- Optional keys for shared state across components
- Support for Server Actions with and without parameters

### Basic Usage

```tsx
'use client';

import { useEffect } from 'react';
import { useServerAction } from '@/lib/hooks/useServerAction';
import { getUsers } from '@/actions/users';

interface User {
  id: number;
  name: string;
  email: string;
}

export function UsersList() {
  const { data, isLoading, error, execute, reset } = useServerAction<User[]>(
    getUsers,
    {
      key: 'users-list', // Optional: share state across components
      onSuccess: (users) => {
        console.log('Users loaded:', users);
      },
      onError: (error) => {
        console.error('Failed to load users:', error);
      },
      onSettled: () => {
        console.log('Request completed');
      },
    }
  );

  useEffect(() => {
    execute();
  }, [execute]);

  if (isLoading) {
    return <div>Loading users...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div>
      <button onClick={() => execute()}>Refresh</button>
      <button onClick={reset}>Clear</button>
      <ul>
        {data?.map((user) => (
          <li key={user.id}>{user.name}</li>
        ))}
      </ul>
    </div>
  );
}
```

### With Parameters

Use `useServerActionWithParams` for Server Actions that take arguments:

```tsx
'use client';

import { useEffect } from 'react';
import { useServerActionWithParams } from '@/lib/hooks/useServerAction';
import { getUser } from '@/actions/users';

export function UserProfile({ userId }: { userId: number }) {
  const { data, isLoading, error, execute } = useServerActionWithParams(
    getUser,
    {
      key: `user-${userId}`,
      onSuccess: (user) => {
        console.log('User loaded:', user);
      },
    }
  );

  useEffect(() => {
    execute(userId);
  }, [userId, execute]);

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h1>{data?.name}</h1>
      <p>{data?.email}</p>
    </div>
  );
}
```

### Mutations

For create/update/delete operations:

```tsx
'use client';

import { useServerActionWithParams } from '@/lib/hooks/useServerAction';
import { createUser, deleteUser } from '@/actions/users';
import { useRouter } from 'next/navigation';

export function CreateUserForm() {
  const router = useRouter();

  const { isLoading, error, execute } = useServerActionWithParams(
    createUser,
    {
      key: 'create-user',
      onSuccess: () => {
        router.push('/users');
      },
    }
  );

  async function handleSubmit(formData: FormData) {
    await execute({
      name: formData.get('name') as string,
      email: formData.get('email') as string,
    });
  }

  return (
    <form action={handleSubmit}>
      <input name="name" required />
      <input name="email" type="email" required />
      <button type="submit" disabled={isLoading}>
        {isLoading ? 'Creating...' : 'Create User'}
      </button>
      {error && <p className="error">{error}</p>}
    </form>
  );
}

export function DeleteUserButton({ userId }: { userId: number }) {
  const { isLoading, execute } = useServerActionWithParams(deleteUser, {
    key: `delete-user-${userId}`,
    onSuccess: () => {
      alert('User deleted');
    },
  });

  return (
    <button onClick={() => execute(userId)} disabled={isLoading}>
      {isLoading ? 'Deleting...' : 'Delete'}
    </button>
  );
}
```

### Multiple Operations

Track different operations independently:

```tsx
'use client';

import { useServerAction, useServerActionWithParams } from '@/lib/hooks/useServerAction';
import { getUsers, createUser, updateUser, deleteUser } from '@/actions/users';

export function UsersManager() {
  // Fetching
  const {
    data: users,
    isLoading: isFetching,
    execute: fetchUsers,
  } = useServerAction(getUsers, { key: 'users-list' });

  // Creating
  const {
    isLoading: isCreating,
    execute: createNewUser,
  } = useServerActionWithParams(createUser, {
    key: 'create-user',
    onSuccess: () => fetchUsers(), // Refresh list
  });

  // Updating
  const {
    isLoading: isUpdating,
    execute: updateExistingUser,
  } = useServerActionWithParams(updateUser, {
    key: 'update-user',
    onSuccess: () => fetchUsers(), // Refresh list
  });

  // Deleting
  const {
    isLoading: isDeleting,
    execute: deleteExistingUser,
  } = useServerActionWithParams(deleteUser, {
    key: 'delete-user',
    onSuccess: () => fetchUsers(), // Refresh list
  });

  // Each operation has its own loading state!
  const isAnyLoading = isFetching || isCreating || isUpdating || isDeleting;

  // ...
}
```

### Shared State Across Components

Use the same key to share state between components:

```tsx
// Component A
function ComponentA() {
  const { data, execute } = useServerAction(getUsers, {
    key: 'shared-users',
  });

  // Both components see the same state!
}

// Component B
function ComponentB() {
  const { data, isLoading } = useServerAction(getUsers, {
    key: 'shared-users',
  });

  // Will show the same data and loading state as Component A
}
```

## API Reference

### `useServerAction<T>(serverAction, options?)`

For Server Actions without parameters.

#### Parameters

- `serverAction`: `() => Promise<ActionResponse<T>>` - Server Action to call
- `options` (optional):
  - `key?: string` - Unique key for state (default: 'default')
  - `onSuccess?: (data: T) => void` - Success callback
  - `onError?: (error: string) => void` - Error callback
  - `onSettled?: () => void` - Settled callback (runs after success or error)

#### Returns

- `data: T | null` - Response data
- `error: string | null` - Error message
- `isLoading: boolean` - Loading state
- `execute: () => Promise<void>` - Function to execute the action
- `reset: () => void` - Reset state

### `useServerActionWithParams<TParams, TResult>(serverAction, options?)`

For Server Actions with parameters.

#### Parameters

- `serverAction`: `(...args: TParams) => Promise<ActionResponse<TResult>>` - Server Action to call
- `options`: Same as `useServerAction`

#### Returns

Same as `useServerAction` except:
- `execute: (...args: TParams) => Promise<void>` - Takes parameters

## Best Practices

1. **Use unique keys** - Provide a unique key for each operation to avoid state conflicts
2. **Refresh after mutations** - Call fetch actions in `onSuccess` callbacks to refresh data
3. **Handle errors** - Always display error messages to users
4. **Loading states** - Disable buttons during loading to prevent duplicate submissions
5. **Reset when needed** - Use `reset()` to clear state when unmounting or navigating away

## Comparison with useSupabase

Both hooks provide similar functionality, but for different purposes:

| Feature | useSupabase | useServerAction |
|---------|------------|-----------------|
| Purpose | Supabase queries | Server Actions |
| State | Zustand | Zustand |
| Usage | Client-side DB | Server Actions |
| Loading | ✓ | ✓ |
| Error handling | ✓ | ✓ |
| Callbacks | ✓ | ✓ |
| Parameters | Manual | Built-in |

**Migration:**

```tsx
// Old (useSupabase)
const { data, execute } = useSupabase<User[]>({
  onSuccess: (users) => console.log(users),
});

await execute(async () => {
  const { data, error } = await supabase.from('users').select('*');
  if (error) throw error;
  return data;
});

// New (useServerAction)
const { data, execute } = useServerAction(getUsers, {
  onSuccess: (users) => console.log(users),
});

await execute(); // Much cleaner!
```
