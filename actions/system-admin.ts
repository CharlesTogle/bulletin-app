'use server';

import { createClient } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/auth';
import { requireSystemAdmin, isSystemAdmin } from '@/lib/auth/permissions';
import { revalidatePath } from 'next/cache';
import type { ActionResponse } from '@/types/database';

/**
 * Server Actions for System Administrators
 *
 * All actions require system admin role verification
 */

// ============================================================================
// SYSTEM ADMIN MANAGEMENT
// ============================================================================

/**
 * Grant system admin role to a user
 */
export async function grantSystemAdmin(
  userId: string
): Promise<ActionResponse<void>> {
  try {
    const currentUser = await requireAuth();
    await requireSystemAdmin('Only system admins can grant admin privileges');

    const supabase = await createClient();

    const { error } = await supabase
      .from('system_roles')
      .insert({
        user_id: userId,
        role: 'system_admin',
        granted_by: currentUser.id,
      });

    if (error) {
      // Handle duplicate entry
      if (error.code === '23505') {
        throw new Error('User is already a system admin');
      }
      throw error;
    }

    return { success: true, data: undefined };
  } catch (error) {
    console.error('Failed to grant system admin:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to grant admin privileges',
    };
  }
}

/**
 * Revoke system admin role from a user
 */
export async function revokeSystemAdmin(
  userId: string
): Promise<ActionResponse<void>> {
  try {
    const currentUser = await requireAuth();
    await requireSystemAdmin('Only system admins can revoke admin privileges');

    // Prevent self-revocation
    if (currentUser.id === userId) {
      throw new Error('You cannot revoke your own admin privileges');
    }

    const supabase = await createClient();

    const { error } = await supabase
      .from('system_roles')
      .delete()
      .eq('user_id', userId);

    if (error) throw error;

    return { success: true, data: undefined };
  } catch (error) {
    console.error('Failed to revoke system admin:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to revoke admin privileges',
    };
  }
}

/**
 * Get list of all system admins
 */
export async function getSystemAdmins(): Promise<
  ActionResponse<
    Array<{
      user_id: string;
      email: string;
      granted_at: string;
      granted_by: string | null;
    }>
  >
> {
  try {
    await requireSystemAdmin();

    const supabase = await createClient();

    const { data, error } = await supabase
      .from('system_roles')
      .select(
        `
        user_id,
        granted_at,
        granted_by
      `
      )
      .order('granted_at', { ascending: false });

    if (error) throw error;

    // Get user emails
    const userIds = data.map((r) => r.user_id);
    const { data: users } = await supabase
      .from('auth.users')
      .select('id, email')
      .in('id', userIds);

    const result = data.map((role) => ({
      user_id: role.user_id,
      email: users?.find((u) => u.id === role.user_id)?.email || 'Unknown',
      granted_at: role.granted_at,
      granted_by: role.granted_by,
    }));

    return { success: true, data: result };
  } catch (error) {
    console.error('Failed to get system admins:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch system admins',
    };
  }
}

// ============================================================================
// GROUP APPROVAL (System Admin)
// ============================================================================

/**
 * Get pending groups awaiting approval
 */
export async function getPendingGroups(): Promise<
  ActionResponse<
    Array<{
      id: string;
      name: string;
      code: string;
      description: string | null;
      created_at: string;
      creator_email: string;
      admin_count: number;
    }>
  >
> {
  try {
    await requireSystemAdmin();

    const supabase = await createClient();

    // Use the SECURITY DEFINER function instead of the view
    const { data, error } = await supabase.rpc('get_pending_groups');

    if (error) throw error;

    return { success: true, data: data || [] };
  } catch (error) {
    // Don't log auth errors during sign out - they're expected
    const isAuthError = error instanceof Error &&
      (error.message.includes('Authentication required') ||
       error.message.includes('System admin privileges required'));

    if (!isAuthError) {
      console.error('Failed to get pending groups:', error);
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch pending groups',
    };
  }
}

/**
 * Approve a group
 */
export async function approveGroup(
  groupId: string
): Promise<ActionResponse<void>> {
  try {
    console.log('[approveGroup] Starting for groupId:', groupId);
    const currentUser = await requireAuth();
    console.log('[approveGroup] User authenticated:', currentUser.id);

    await requireSystemAdmin('Only system admins can approve groups');
    console.log('[approveGroup] System admin verified');

    const supabase = await createClient();

    console.log('[approveGroup] Updating group...');
    const { error } = await supabase
      .from('groups')
      .update({
        approved: true,
        approved_at: new Date().toISOString(),
        approved_by: currentUser.id,
      })
      .eq('id', groupId);

    if (error) {
      console.error('[approveGroup] Update error:', error);
      throw error;
    }

    console.log('[approveGroup] Group approved successfully');
    revalidatePath('/admin/groups');
    revalidatePath('/admin/pending');
    revalidatePath(`/groups/${groupId}`);

    return { success: true, data: undefined };
  } catch (error) {
    console.error('[approveGroup] Failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to approve group',
    };
  }
}

/**
 * Reject a group (marks as rejected without deletion)
 */
export async function rejectGroup(
  groupId: string
): Promise<ActionResponse<void>> {
  try {
    console.log('[rejectGroup] Starting for groupId:', groupId);

    const currentUser = await requireAuth();
    await requireSystemAdmin('Only system admins can reject groups');
    console.log('[rejectGroup] System admin verified');

    const supabase = await createClient();

    // Mark group as rejected instead of deleting
    console.log('[rejectGroup] Marking group as rejected...');
    const { error } = await supabase
      .from('groups')
      .update({
        rejected_at: new Date().toISOString(),
        rejected_by: currentUser.id,
      })
      .eq('id', groupId);

    if (error) {
      console.error('[rejectGroup] Update error:', error);
      throw error;
    }

    console.log('[rejectGroup] Group rejected successfully');
    revalidatePath('/admin/groups');
    revalidatePath('/admin/pending');

    return { success: true, data: undefined };
  } catch (error) {
    console.error('[rejectGroup] Failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to reject group',
    };
  }
}

// ============================================================================
// GROUP MANAGEMENT (System Admin)
// ============================================================================

/**
 * Create a group as system admin
 * Optionally specify the admin user (defaults to creator)
 */
export async function createGroupAsAdmin(data: {
  name: string;
  description?: string;
  adminUserId?: string; // If not provided, current user becomes admin
}): Promise<ActionResponse<{ id: string; code: string }>> {
  try {
    const currentUser = await requireAuth();
    await requireSystemAdmin('Only system admins can create groups administratively');

    const supabase = await createClient();

    // Create group
    const { data: group, error: groupError } = await supabase
      .from('groups')
      .insert({
        name: data.name,
        description: data.description,
        creator_id: currentUser.id,
      })
      .select('id, code')
      .single();

    if (groupError) throw groupError;

    // If a different admin is specified, update the auto-created membership
    if (data.adminUserId && data.adminUserId !== currentUser.id) {
      // Remove current user as admin
      await supabase
        .from('group_members')
        .delete()
        .eq('group_id', group.id)
        .eq('user_id', currentUser.id);

      // Add specified user as admin
      await supabase.from('group_members').insert({
        group_id: group.id,
        user_id: data.adminUserId,
        role: 'admin',
      });
    }

    revalidatePath('/admin/groups');

    return {
      success: true,
      data: { id: group.id, code: group.code },
    };
  } catch (error) {
    console.error('Failed to create group:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create group',
    };
  }
}

/**
 * Delete a group (system admin only)
 */
export async function deleteGroupAsAdmin(
  groupId: string
): Promise<ActionResponse<void>> {
  try {
    await requireSystemAdmin('Only system admins can delete groups');

    const supabase = await createClient();

    const { error } = await supabase
      .from('groups')
      .delete()
      .eq('id', groupId);

    if (error) throw error;

    revalidatePath('/admin/groups');
    revalidatePath('/groups');

    return { success: true, data: undefined };
  } catch (error) {
    console.error('Failed to delete group:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete group',
    };
  }
}

// ============================================================================
// STATISTICS (System Admin)
// ============================================================================

/**
 * Get system-wide statistics
 */
export async function getSystemStatistics(): Promise<
  ActionResponse<{
    total_groups: number;
    total_announcements: number;
    total_memberships: number;
    total_active_users: number;
    total_votes: number;
    total_attachments: number;
  }>
> {
  try {
    await requireSystemAdmin();

    const supabase = await createClient();

    const { data, error } = await supabase
      .from('system_statistics')
      .select('*')
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    // Don't log auth errors during sign out - they're expected
    const isAuthError = error instanceof Error &&
      (error.message.includes('Authentication required') ||
       error.message.includes('System admin privileges required'));

    if (!isAuthError) {
      console.error('Failed to get system statistics:', error);
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch statistics',
    };
  }
}

/**
 * Get groups created timeline (for graphs)
 */
export async function getGroupsTimeline(
  days: number = 30
): Promise<
  ActionResponse<Array<{ date: string; groups_created: number }>>
> {
  try {
    await requireSystemAdmin();

    const supabase = await createClient();

    const { data, error } = await supabase
      .from('groups_created_timeline')
      .select('*')
      .limit(days);

    if (error) throw error;

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Failed to get groups timeline:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch timeline',
    };
  }
}

/**
 * Get announcements created timeline (for graphs)
 */
export async function getAnnouncementsTimeline(
  days: number = 30
): Promise<
  ActionResponse<Array<{ date: string; announcements_created: number }>>
> {
  try {
    await requireSystemAdmin();

    const supabase = await createClient();

    const { data, error } = await supabase
      .from('announcements_created_timeline')
      .select('*')
      .limit(days);

    if (error) throw error;

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Failed to get announcements timeline:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch timeline',
    };
  }
}

/**
 * Get group activity statistics
 */
export async function getGroupActivityStats(): Promise<
  ActionResponse<
    Array<{
      id: string;
      name: string;
      code: string;
      created_at: string;
      member_count: number;
      announcement_count: number;
      total_votes: number;
      last_announcement_at: string | null;
    }>
  >
> {
  try {
    await requireSystemAdmin();

    const supabase = await createClient();

    const { data, error } = await supabase
      .from('group_activity_stats')
      .select('*')
      .limit(100);

    if (error) throw error;

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Failed to get group activity stats:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch activity stats',
    };
  }
}

/**
 * Get top active groups
 */
export async function getTopActiveGroups(): Promise<
  ActionResponse<
    Array<{
      id: string;
      name: string;
      code: string;
      announcement_count: number;
      member_count: number;
      vote_count: number;
    }>
  >
> {
  try {
    await requireSystemAdmin();

    const supabase = await createClient();

    const { data, error } = await supabase
      .from('top_active_groups')
      .select('*');

    if (error) throw error;

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Failed to get top active groups:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch top groups',
    };
  }
}

/**
 * Get user activity statistics
 */
export async function getUserActivityStats(): Promise<
  ActionResponse<
    Array<{
      id: string;
      email: string;
      groups_joined: number;
      announcements_created: number;
      votes_cast: number;
      last_announcement_at: string | null;
      last_vote_at: string | null;
    }>
  >
> {
  try {
    await requireSystemAdmin();

    const supabase = await createClient();

    const { data, error } = await supabase
      .from('user_activity_stats')
      .select('*')
      .limit(100);

    if (error) throw error;

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Failed to get user activity stats:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch user stats',
    };
  }
}

// ============================================================================
// PERMISSION CHECKER (Helper for UI)
// ============================================================================

/**
 * Check if current user is system admin
 */
export async function checkSystemAdminStatus(): Promise<
  ActionResponse<{ isSystemAdmin: boolean }>
> {
  try {
    await requireAuth();
    const isSysAdmin = await isSystemAdmin();

    return {
      success: true,
      data: { isSystemAdmin: isSysAdmin },
    };
  } catch (error) {
    console.error('[checkSystemAdminStatus] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to check admin status',
    };
  }
}
