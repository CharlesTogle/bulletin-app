'use client';

import { useEffect } from 'react';
import { supabase, useSupabase } from './index';

interface Todo {
  id: number;
  title: string;
  completed: boolean;
}

export function TodosExample() {
  // Basic usage with callbacks
  // State is managed by Zustand store under the hood
  // Optional: provide a key for shared state across components
  const {
    data: todos,
    isLoading,
    error,
    execute: fetchTodos,
  } = useSupabase<Todo[]>({
    key: 'todos-list', // Optional: share state across components with same key
    onSuccess: (data) => {
      console.log('Todos loaded successfully:', data);
    },
    onError: (error) => {
      console.error('Failed to load todos:', error);
    },
    onSettled: () => {
      console.log('Request completed');
    },
  });

  // Fetch todos on mount
  useEffect(() => {
    const getTodos = async () => {
      const { data, error } = await supabase
        .from('todos')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    };

    fetchTodos(getTodos);
  }, [fetchTodos]);

  // Create todo example
  // Each instance has its own state in the Zustand store
  const {
    isLoading: isCreating,
    execute: createTodo,
  } = useSupabase<Todo>({
    key: 'create-todo', // Separate loading state from fetch
    onSuccess: (newTodo) => {
      console.log('Todo created:', newTodo);
      // Refetch todos after creation
      fetchTodos(async () => {
        const { data, error } = await supabase.from('todos').select('*');
        if (error) throw error;
        return data;
      });
    },
  });

  const handleCreateTodo = async (title: string) => {
    await createTodo(async () => {
      const { data, error } = await supabase
        .from('todos')
        .insert({ title, completed: false })
        .select()
        .single();

      if (error) throw error;
      return data;
    });
  };

  // Update todo example
  const { execute: updateTodo } = useSupabase<Todo>({
    onSuccess: () => {
      // Refetch todos after update
      fetchTodos(async () => {
        const { data, error } = await supabase.from('todos').select('*');
        if (error) throw error;
        return data;
      });
    },
  });

  const handleToggleTodo = async (id: number, completed: boolean) => {
    await updateTodo(async () => {
      const { data, error } = await supabase
        .from('todos')
        .update({ completed: !completed })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    });
  };

  if (isLoading) {
    return <div>Loading todos...</div>;
  }

  if (error) {
    return <div>Error: {error.message}</div>;
  }

  return (
    <div>
      <h1>Todos</h1>
      <button
        onClick={() => handleCreateTodo('New Todo')}
        disabled={isCreating}
      >
        {isCreating ? 'Creating...' : 'Add Todo'}
      </button>
      <ul>
        {todos?.map((todo) => (
          <li key={todo.id}>
            <input
              type="checkbox"
              checked={todo.completed}
              onChange={() => handleToggleTodo(todo.id, todo.completed)}
            />
            <span>{todo.title}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
