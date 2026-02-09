'use server';

import { createClient } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/auth';

export type GroupRole = 'admin' | 'contributor' | 'member';
export type SystemRole = 'system_admin';

/**
 * Get user's role in a specific group
 */
export async function getUserGroupRole(
  groupId: string
): Promise<{ role: GroupRole | null; isMember: boolean }> {
  try {
    const user = await requireAuth();
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('group_members')
      .select('role')
      .eq('group_id', groupId)
      .eq('user_id', user.id)
      .single();

    if (error || !data) {
      return { role: null, isMember: false };
    }

    return { role: data.role as GroupRole, isMember: true };
  } catch {
    return { role: null, isMember: false };
  }
}

/**
 * Check if user has required role in group
 */
export async function hasGroupPermission(
  groupId: string,
  requiredRoles: GroupRole[]
): Promise<boolean> {
  const { role } = await getUserGroupRole(groupId);
  return role !== null && requiredRoles.includes(role);
}

/**
 * Require user to have specific role in group
 * Throws error if user doesn't have permission
 */
export async function requireGroupRole(
  groupId: string,
  requiredRoles: GroupRole[],
  errorMessage: string = 'Insufficient permissions'
): Promise<GroupRole> {
  const { role, isMember } = await getUserGroupRole(groupId);

  if (!isMember) {
    throw new Error('You are not a member of this group');
  }

  if (!role || !requiredRoles.includes(role)) {
    throw new Error(errorMessage);
  }

  return role;
}

/**
 * Check if user is admin of a group
 */
export async function isGroupAdmin(groupId: string): Promise<boolean> {
  return hasGroupPermission(groupId, ['admin']);
}

/**
 * Check if user is admin or contributor
 */
export async function canCreateAnnouncements(groupId: string): Promise<boolean> {
  return hasGroupPermission(groupId, ['admin', 'contributor']);
}

/**
 * Check if user can edit/delete an announcement
 * (must be author or admin)
 */
export async function canModifyAnnouncement(
  announcementId: string
): Promise<{ canModify: boolean; isAuthor: boolean; isAdmin: boolean }> {
  try {
    const user = await requireAuth();
    const supabase = await createClient();

    // Get announcement details
    const { data: announcement, error } = await supabase
      .from('announcements')
      .select('author_id, group_id')
      .eq('id', announcementId)
      .single();

    if (error || !announcement) {
      return { canModify: false, isAuthor: false, isAdmin: false };
    }

    const isAuthor = announcement.author_id === user.id;
    const isAdmin = await isGroupAdmin(announcement.group_id);
    const canModify = isAuthor || isAdmin;

    return { canModify, isAuthor, isAdmin };
  } catch {
    return { canModify: false, isAuthor: false, isAdmin: false };
  }
}

// ============================================================================
// SYSTEM ADMIN PERMISSIONS
// ============================================================================

/**
 * Check if user is a system admin
 */
export async function isSystemAdmin(): Promise<boolean> {
  try {
    const user = await requireAuth();
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('system_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'system_admin')
      .single();

    return !error && !!data;
  } catch {
    return false;
  }
}

/**
 * Require user to be a system admin
 * Throws error if user is not a system admin
 */
export async function requireSystemAdmin(
  errorMessage: string = 'System admin privileges required'
): Promise<void> {
  const isAdmin = await isSystemAdmin();

  if (!isAdmin) {
    throw new Error(errorMessage);
  }
}

/**
 * Check if user is system admin OR group admin
 * System admins have access to all groups
 */
export async function canAccessGroup(groupId: string): Promise<boolean> {
  const isSysAdmin = await isSystemAdmin();
  if (isSysAdmin) return true;

  const { isMember } = await getUserGroupRole(groupId);
  return isMember;
}

/**
 * Check if user can manage group settings
 * System admins or group admins only
 */
export async function canManageGroup(groupId: string): Promise<boolean> {
  const isSysAdmin = await isSystemAdmin();
  if (isSysAdmin) return true;

  return isGroupAdmin(groupId);
}
