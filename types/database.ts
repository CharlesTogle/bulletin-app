/**
 * Database types for Bulletin App
 *
 * These types match the database schema
 */

export interface Group {
  id: string;
  creator_id: string;
  name: string;
  code: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface GroupMember {
  id: string;
  group_id: string;
  user_id: string;
  role: 'admin' | 'moderator' | 'member';
  joined_at: string;
}

export interface GroupWithStats extends Group {
  member_count: number;
  admin_count: number;
}

export interface Post {
  id: string;
  user_id: string;
  group_id: string | null;  // Posts can belong to a group
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
}

// Response types for API consistency
export type ActionResponse<T> =
  | { success: true; data: T }
  | { success: false; error: string };
