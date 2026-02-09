'use server';

import { query } from '@/lib/db';
import { revalidatePath } from 'next/cache';

/**
 * Example Server Action for database operations
 *
 * This file demonstrates the pattern for all database interactions.
 * Copy this pattern when creating new actions.
 */

// Define your data types
interface ExampleItem {
  id: number;
  title: string;
  description: string;
  created_at: Date;
}

// Response type for consistent error handling
type ActionResponse<T> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Get all items (READ operation)
 */
export async function getItems(): Promise<ActionResponse<ExampleItem[]>> {
  try {
    const result = await query<ExampleItem>(
      'SELECT * FROM items ORDER BY created_at DESC'
    );

    return { success: true, data: result.rows };
  } catch (error) {
    console.error('Failed to get items:', error);
    return { success: false, error: 'Failed to fetch items' };
  }
}

/**
 * Get a single item by ID (READ operation)
 */
export async function getItem(id: number): Promise<ActionResponse<ExampleItem>> {
  try {
    const result = await query<ExampleItem>(
      'SELECT * FROM items WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return { success: false, error: 'Item not found' };
    }

    return { success: true, data: result.rows[0] };
  } catch (error) {
    console.error('Failed to get item:', error);
    return { success: false, error: 'Failed to fetch item' };
  }
}

/**
 * Create a new item (CREATE operation)
 */
export async function createItem(
  data: Pick<ExampleItem, 'title' | 'description'>
): Promise<ActionResponse<ExampleItem>> {
  try {
    const result = await query<ExampleItem>(
      'INSERT INTO items (title, description) VALUES ($1, $2) RETURNING *',
      [data.title, data.description]
    );

    // Revalidate the items list page
    revalidatePath('/items');

    return { success: true, data: result.rows[0] };
  } catch (error) {
    console.error('Failed to create item:', error);
    return { success: false, error: 'Failed to create item' };
  }
}

/**
 * Update an existing item (UPDATE operation)
 */
export async function updateItem(
  id: number,
  data: Partial<Pick<ExampleItem, 'title' | 'description'>>
): Promise<ActionResponse<ExampleItem>> {
  try {
    // Build dynamic UPDATE query based on provided fields
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (data.title !== undefined) {
      updates.push(`title = $${paramCount++}`);
      values.push(data.title);
    }

    if (data.description !== undefined) {
      updates.push(`description = $${paramCount++}`);
      values.push(data.description);
    }

    if (updates.length === 0) {
      return { success: false, error: 'No fields to update' };
    }

    values.push(id);

    const result = await query<ExampleItem>(
      `UPDATE items SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return { success: false, error: 'Item not found' };
    }

    // Revalidate both the list and detail pages
    revalidatePath('/items');
    revalidatePath(`/items/${id}`);

    return { success: true, data: result.rows[0] };
  } catch (error) {
    console.error('Failed to update item:', error);
    return { success: false, error: 'Failed to update item' };
  }
}

/**
 * Delete an item (DELETE operation)
 */
export async function deleteItem(id: number): Promise<ActionResponse<void>> {
  try {
    const result = await query(
      'DELETE FROM items WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rows.length === 0) {
      return { success: false, error: 'Item not found' };
    }

    // Revalidate the items list page
    revalidatePath('/items');

    return { success: true, data: undefined };
  } catch (error) {
    console.error('Failed to delete item:', error);
    return { success: false, error: 'Failed to delete item' };
  }
}
