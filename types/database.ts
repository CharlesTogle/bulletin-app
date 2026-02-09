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
  approved: boolean;
  approved_at: string | null;
  approved_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface GroupMember {
  id: string;
  group_id: string;
  user_id: string;
  role: 'admin' | 'contributor' | 'member';
  joined_at: string;
}

export interface GroupWithStats extends Group {
  member_count: number;
  admin_count: number;
  announcement_count?: number; // Optional, only populated for system admins
}

export interface SystemRole {
  user_id: string;
  role: 'system_admin';
  granted_at: string;
  granted_by: string | null;
}

export interface Category {
  id: string;
  name: string;
  description: string | null;
  color: string;  // Hex color code
  icon: string | null;  // Lucide icon name
  created_at: string;
}

export interface Tag {
  id: string;
  name: string;
  created_at: string;
}

export interface Announcement {
  id: string;
  group_id: string;
  author_id: string;
  category_id: string | null;
  title: string;
  content: string;  // Markdown content
  deadline: string | null;  // ISO 8601 timestamp
  is_pinned: boolean;
  is_archived: boolean;
  upvotes_count: number;
  downvotes_count: number;
  created_at: string;
  updated_at: string;
}

export interface AnnouncementTag {
  id: string;
  announcement_id: string;
  tag_id: string;
  created_at: string;
}

export interface Vote {
  id: string;
  announcement_id: string;
  user_id: string;
  vote_type: 'upvote' | 'downvote';
  created_at: string;
  updated_at: string;
}

export interface Attachment {
  id: string;
  announcement_id: string;
  uploader_id: string;
  filename: string;
  file_path: string;  // Path in Supabase Storage
  file_size: number;  // Bytes
  mime_type: string;
  created_at: string;
}

export interface AnnouncementWithDetails extends Announcement {
  author_email: string;
  category_name: string | null;
  category_color: string | null;
  tag_names: string[] | null;
  net_votes: number;
}

// System Admin Statistics Types
export interface SystemStatistics {
  total_groups: number;
  total_announcements: number;
  total_memberships: number;
  total_active_users: number;
  total_votes: number;
  total_attachments: number;
}

export interface GroupActivityStat {
  id: string;
  name: string;
  code: string;
  created_at: string;
  member_count: number;
  announcement_count: number;
  total_votes: number;
  last_announcement_at: string | null;
}

export interface UserActivityStat {
  id: string;
  email: string;
  groups_joined: number;
  announcements_created: number;
  votes_cast: number;
  last_announcement_at: string | null;
  last_vote_at: string | null;
}

export interface TimelineData {
  date: string;
  groups_created?: number;
  announcements_created?: number;
}

// Response types for API consistency
export type ActionResponse<T> =
  | { success: true; data: T }
  | { success: false; error: string };
