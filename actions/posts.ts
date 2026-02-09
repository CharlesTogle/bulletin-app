'use server';

import { createClient } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

/**
 * Example Server Actions using Supabase with RLS
 *
 * These actions demonstrate:
 * - Automatic user context via RLS
 * - No need to manually add user_id to WHERE clauses
 * - Database-level security
 * - Consistent error handling
 */

// Define your data types
export interface Post {
  id: string;
  user_id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
}

// Response type for consistent error handling
type ActionResponse<T> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Get all posts for the current user
 *
 * With RLS enabled, this automatically filters by current user
 */
export async function getPosts(): Promise<ActionResponse<Post[]>> {
  try {
    await requireAuth(); // Ensure user is authenticated

    const supabase = await createClient();
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Failed to get posts:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch posts',
    };
  }
}

/**
 * Get a single post by ID
 *
 * RLS ensures user can only access their own posts
 */
export async function getPost(id: string): Promise<ActionResponse<Post>> {
  try {
    await requireAuth();

    const supabase = await createClient();
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Failed to get post:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch post',
    };
  }
}

/**
 * Create a new post
 *
 * user_id is automatically set via RLS/auth.uid()
 */
export async function createPost(
  data: Pick<Post, 'title' | 'content'>
): Promise<ActionResponse<Post>> {
  try {
    const user = await requireAuth();

    const supabase = await createClient();
    const { data: post, error } = await supabase
      .from('posts')
      .insert({
        user_id: user.id, // Explicitly set user_id
        title: data.title,
        content: data.content,
      })
      .select()
      .single();

    if (error) throw error;

    revalidatePath('/posts');

    return { success: true, data: post };
  } catch (error) {
    console.error('Failed to create post:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create post',
    };
  }
}

/**
 * Update an existing post
 *
 * RLS ensures user can only update their own posts
 */
export async function updatePost(
  id: string,
  data: Partial<Pick<Post, 'title' | 'content'>>
): Promise<ActionResponse<Post>> {
  try {
    await requireAuth();

    const supabase = await createClient();
    const { data: post, error } = await supabase
      .from('posts')
      .update({
        ...data,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    revalidatePath('/posts');
    revalidatePath(`/posts/${id}`);

    return { success: true, data: post };
  } catch (error) {
    console.error('Failed to update post:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update post',
    };
  }
}

/**
 * Delete a post
 *
 * RLS ensures user can only delete their own posts
 */
export async function deletePost(id: string): Promise<ActionResponse<void>> {
  try {
    await requireAuth();

    const supabase = await createClient();
    const { error } = await supabase.from('posts').delete().eq('id', id);

    if (error) throw error;

    revalidatePath('/posts');

    return { success: true, data: undefined };
  } catch (error) {
    console.error('Failed to delete post:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete post',
    };
  }
}
