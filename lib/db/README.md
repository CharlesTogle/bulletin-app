# Database Access

**🚨 CRITICAL: ALL database interactions MUST happen in Server Actions. NEVER access the database from client components.**

## Rules

1. **NO CLIENT-SIDE DATABASE ACCESS** - Database queries can ONLY happen in:
   - Server Actions (`'use server'`)
   - API Routes
   - Server Components (when absolutely necessary)

2. **ALL mutations via Server Actions** - Create, Update, Delete operations MUST use Server Actions

3. **Read operations** - Prefer Server Actions, but Server Components are acceptable for initial data

## Database Connection

Connection is managed via a singleton pool in `lib/db/index.ts`:

```typescript
import { query } from '@/lib/db';

// Execute queries
const result = await query('SELECT * FROM users WHERE id = $1', [userId]);
```

## Environment Variables

Required in `.env.local`:

```env
DATABASE_NAME=bulletin-app
DATABASE_HOST=localhost
DATABASE_USER=postgres
DATABASE_PASSWORD=your_password
DATABASE_PORT=5432
```

## Server Actions Pattern

All database operations should be implemented as Server Actions in the `actions/` directory.

### Creating a Server Action

```typescript
// actions/users.ts
'use server';

import { query } from '@/lib/db';
import { revalidatePath } from 'next/cache';

interface User {
  id: number;
  email: string;
  name: string;
}

export async function getUser(id: number) {
  try {
    const result = await query<User>(
      'SELECT id, email, name FROM users WHERE id = $1',
      [id]
    );

    return { success: true, data: result.rows[0] };
  } catch (error) {
    console.error('Failed to get user:', error);
    return { success: false, error: 'Failed to fetch user' };
  }
}

export async function createUser(data: { email: string; name: string }) {
  try {
    const result = await query<User>(
      'INSERT INTO users (email, name) VALUES ($1, $2) RETURNING *',
      [data.email, data.name]
    );

    revalidatePath('/users'); // Revalidate cached data

    return { success: true, data: result.rows[0] };
  } catch (error) {
    console.error('Failed to create user:', error);
    return { success: false, error: 'Failed to create user' };
  }
}

export async function updateUser(id: number, data: { name: string }) {
  try {
    const result = await query<User>(
      'UPDATE users SET name = $1 WHERE id = $2 RETURNING *',
      [data.name, id]
    );

    revalidatePath('/users');
    revalidatePath(`/users/${id}`);

    return { success: true, data: result.rows[0] };
  } catch (error) {
    console.error('Failed to update user:', error);
    return { success: false, error: 'Failed to update user' };
  }
}

export async function deleteUser(id: number) {
  try {
    await query('DELETE FROM users WHERE id = $1', [id]);

    revalidatePath('/users');

    return { success: true };
  } catch (error) {
    console.error('Failed to delete user:', error);
    return { success: false, error: 'Failed to delete user' };
  }
}
```

### Using Server Actions in Client Components

```tsx
'use client';

import { useState } from 'react';
import { createUser } from '@/actions/users';
import { useRouter } from 'next/navigation';

export function CreateUserForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setIsLoading(true);

    const result = await createUser({
      email: formData.get('email') as string,
      name: formData.get('name') as string,
    });

    if (result.success) {
      router.push('/users');
    } else {
      alert(result.error);
    }

    setIsLoading(false);
  }

  return (
    <form action={handleSubmit}>
      <input name="email" type="email" required />
      <input name="name" type="text" required />
      <button type="submit" disabled={isLoading}>
        {isLoading ? 'Creating...' : 'Create User'}
      </button>
    </form>
  );
}
```

## Response Pattern

All Server Actions should return a consistent response format:

```typescript
type ActionResponse<T> =
  | { success: true; data: T }
  | { success: false; error: string };
```

## Best Practices

1. **Always use parameterized queries** - Prevent SQL injection: `query('SELECT * FROM users WHERE id = $1', [id])`

2. **Handle errors gracefully** - Catch errors and return user-friendly messages

3. **Revalidate paths** - Use `revalidatePath()` after mutations to update cached data

4. **Type your queries** - Use TypeScript generics: `query<User>(...)`

5. **Use Zustand for client state** - Server Actions update the server, Zustand manages client state

## Migration from Supabase Client

❌ **Old (Client-Side Supabase):**
```tsx
'use client';
import { supabase } from '@/lib/supabase';

const { data } = await supabase.from('users').select('*');
```

✅ **New (Server Actions):**
```tsx
'use client';
import { getUsers } from '@/actions/users';

const result = await getUsers();
if (result.success) {
  // Use result.data
}
```

## File Organization

```
actions/
  ├── users.ts         # User-related actions
  ├── posts.ts         # Post-related actions
  └── comments.ts      # Comment-related actions

lib/
  └── db/
      ├── index.ts     # Database connection
      └── README.md    # This file
```

## Remember

**🚨 NEVER access the database from client components. ALL database operations MUST go through Server Actions.**
