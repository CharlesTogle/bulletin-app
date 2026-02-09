'use server';

import { createClient } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import type { Group, GroupMember, GroupWithStats, ActionResponse } from '@/types/database';

/**
 * Server Actions for Groups
 *
 * These actions handle all group-related operations with RLS enforcement
 */

// ============================================================================
// GROUP CRUD OPERATIONS
// ============================================================================

/**
 * Get all groups the current user is a member of
 */
export async function getMyGroups(): Promise<ActionResponse<GroupWithStats[]>> {
  try {
    console.log('[getMyGroups] Starting...');
    const user = await requireAuth();
    console.log('[getMyGroups] User authenticated:', user.id);

    const supabase = await createClient();

    // Check if user is system admin
    console.log('[getMyGroups] Checking system admin status...');
    const { data: systemRole, error: roleError } = await supabase
      .from('system_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'system_admin')
      .single();

    if (roleError && roleError.code !== 'PGRST116') {
      console.error('[getMyGroups] System role check error:', roleError);
      throw roleError;
    }

    const isSystemAdmin = !!systemRole;
    console.log('[getMyGroups] Is system admin:', isSystemAdmin);

    // System admins can see ALL groups
    if (isSystemAdmin) {
      console.log('[getMyGroups] Fetching all groups (system admin)...');

      // Fetch groups with counts in a single query using SQL aggregation
      const { data: groups, error } = await supabase.rpc('get_all_groups_with_counts');

      if (error) {
        console.error('[getMyGroups] System admin groups fetch error:', error);
        throw error;
      }

      console.log('[getMyGroups] Fetched groups:', groups?.length || 0);

      return { success: true, data: groups as GroupWithStats[] };
    }

    // Regular users: Get groups where user is a member
    const { data: memberGroups, error: memberError } = await supabase
      .from('group_members')
      .select('group_id')
      .eq('user_id', user.id);

    if (memberError) throw memberError;

    const groupIds = memberGroups?.map((m) => m.group_id) || [];

    if (groupIds.length === 0) {
      return { success: true, data: [] };
    }

    // Get group details
    const { data, error } = await supabase
      .from('groups')
      .select('*')
      .in('id', groupIds)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Regular user groups fetch error:', error);
      throw error;
    }

    // For now, just return groups with default counts
    // TODO: Add proper member counts later
    const formattedData = data?.map((g: any) => ({
      ...g,
      member_count: 0,
      admin_count: 0,
    }));

    return { success: true, data: formattedData as GroupWithStats[] };
  } catch (error) {
    console.error('Failed to get groups:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch groups',
    };
  }
}

/**
 * Get a single group by ID
 */
export async function getGroup(groupId: string): Promise<ActionResponse<Group>> {
  try {
    await requireAuth();

    const supabase = await createClient();
    const { data, error } = await supabase
      .from('groups')
      .select('*')
      .eq('id', groupId)
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Failed to get group:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch group',
    };
  }
}

/**
 * Create a new group
 * Automatically generates a unique group code and adds creator as admin
 */
export async function createGroup(
  data: Pick<Group, 'name'> & { description?: string }
): Promise<ActionResponse<Group>> {
  try {
    console.log('[createGroup] Starting...');
    const user = await requireAuth();
    console.log('[createGroup] User authenticated:', user.id);

    const supabase = await createClient();

    // Debug: Check if we have a valid session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    console.log('[createGroup] Session check:', {
      hasSession: !!session,
      userId: session?.user?.id,
      error: sessionError
    });

    // Generate unique group code
    const { data: codeData, error: codeError } = await supabase.rpc(
      'generate_group_code',
      { length: 8 }
    );

    if (codeError) throw codeError;

    // Create group
    const { data: group, error } = await supabase
      .from('groups')
      .insert({
        creator_id: user.id,
        name: data.name,
        code: codeData,
        description: data.description || null,
      })
      .select()
      .single();

    if (error) throw error;

    revalidatePath('/groups');

    return { success: true, data: group };
  } catch (error) {
    console.error('Failed to create group:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create group',
    };
  }
}

/**
 * Update a group (admin only)
 */
export async function updateGroup(
  groupId: string,
  data: Partial<Pick<Group, 'name' | 'description'>>
): Promise<ActionResponse<Group>> {
  try {
    await requireAuth();

    const supabase = await createClient();
    const { data: group, error } = await supabase
      .from('groups')
      .update(data)
      .eq('id', groupId)
      .select()
      .single();

    if (error) throw error;

    revalidatePath('/groups');
    revalidatePath(`/groups/${groupId}`);

    return { success: true, data: group };
  } catch (error) {
    console.error('Failed to update group:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update group',
    };
  }
}

/**
 * Delete a group (admin only)
 */
export async function deleteGroup(groupId: string): Promise<ActionResponse<void>> {
  try {
    await requireAuth();

    const supabase = await createClient();
    const { error } = await supabase.from('groups').delete().eq('id', groupId);

    if (error) throw error;

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
// GROUP MEMBERSHIP OPERATIONS
// ============================================================================

/**
 * Join a group using group code
 */
export async function joinGroup(groupCode: string): Promise<ActionResponse<Group>> {
  try {
    const user = await requireAuth();
    const supabase = await createClient();

    // Find group by code (case-insensitive)
    const { data: group, error: groupError } = await supabase
      .from('groups')
      .select('*')
      .ilike('code', groupCode)
      .single();

    if (groupError) {
      if (groupError.code === 'PGRST116') {
        return { success: false, error: 'Group does not exist' };
      }
      throw groupError;
    }

    // Check if group is approved (hide unapproved groups from members)
    if (!group.approved) {
      return { success: false, error: 'Group does not exist' };
    }

    // Check if already a member
    const { data: existingMember } = await supabase
      .from('group_members')
      .select('id')
      .eq('group_id', group.id)
      .eq('user_id', user.id)
      .single();

    if (existingMember) {
      return { success: false, error: 'You are already a member of this group' };
    }

    // Join group as member (RLS policy will enforce approved=true)
    const { error: joinError } = await supabase
      .from('group_members')
      .insert({
        group_id: group.id,
        user_id: user.id,
        role: 'member',
      });

    if (joinError) throw joinError;

    revalidatePath('/groups');

    return { success: true, data: group };
  } catch (error) {
    console.error('Failed to join group:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to join group',
    };
  }
}

/**
 * Leave a group
 */
export async function leaveGroup(groupId: string): Promise<ActionResponse<void>> {
  try {
    const user = await requireAuth();
    const supabase = await createClient();

    // Check if user is the only admin
    const { data: admins, error: adminError } = await supabase
      .from('group_members')
      .select('id')
      .eq('group_id', groupId)
      .eq('role', 'admin');

    if (adminError) throw adminError;

    if (admins.length === 1) {
      // Check if this user is the only admin
      const { data: userAdmin } = await supabase
        .from('group_members')
        .select('id')
        .eq('group_id', groupId)
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .single();

      if (userAdmin) {
        return {
          success: false,
          error: 'You are the only admin. Please promote another member before leaving.',
        };
      }
    }

    // Leave group
    const { error } = await supabase
      .from('group_members')
      .delete()
      .eq('group_id', groupId)
      .eq('user_id', user.id);

    if (error) throw error;

    revalidatePath('/groups');
    revalidatePath(`/groups/${groupId}`);

    return { success: true, data: undefined };
  } catch (error) {
    console.error('Failed to leave group:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to leave group',
    };
  }
}

/**
 * Get all members of a group
 */
export async function getGroupMembers(
  groupId: string
): Promise<ActionResponse<GroupMember[]>> {
  try {
    await requireAuth();

    const supabase = await createClient();
    const { data, error } = await supabase
      .from('group_members')
      .select('*')
      .eq('group_id', groupId)
      .order('joined_at', { ascending: true });

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Failed to get group members:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch members',
    };
  }
}

/**
 * Update a member's role (admin only)
 */
export async function updateMemberRole(
  groupId: string,
  userId: string,
  role: 'admin' | 'contributor' | 'member'
): Promise<ActionResponse<GroupMember>> {
  try {
    await requireAuth();

    const supabase = await createClient();
    const { data, error } = await supabase
      .from('group_members')
      .update({ role })
      .eq('group_id', groupId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;

    revalidatePath(`/groups/${groupId}`);

    return { success: true, data };
  } catch (error) {
    console.error('Failed to update member role:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update member role',
    };
  }
}

/**
 * Remove a member from group (admin only)
 */
export async function removeMember(
  groupId: string,
  userId: string
): Promise<ActionResponse<void>> {
  try {
    await requireAuth();

    const supabase = await createClient();
    const { error } = await supabase
      .from('group_members')
      .delete()
      .eq('group_id', groupId)
      .eq('user_id', userId);

    if (error) throw error;

    revalidatePath(`/groups/${groupId}`);

    return { success: true, data: undefined };
  } catch (error) {
    console.error('Failed to remove member:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to remove member',
    };
  }
}

// ============================================================================
// GROUP APPROVAL STATUS
// ============================================================================

/**
 * Check if current user has any unapproved groups where they are admin
 * Used to redirect to pending approval page
 */
export async function checkUserGroupApprovalStatus(): Promise<
  ActionResponse<{
    hasUnapprovedGroup: boolean;
    unapprovedGroupId: string | null;
  }>
> {
  try {
    const user = await requireAuth();
    const supabase = await createClient();

    // Get groups where user is admin
    const { data: adminMemberships, error: memberError } = await supabase
      .from('group_members')
      .select('group_id')
      .eq('user_id', user.id)
      .eq('role', 'admin');

    if (memberError) throw memberError;

    if (!adminMemberships || adminMemberships.length === 0) {
      return {
        success: true,
        data: { hasUnapprovedGroup: false, unapprovedGroupId: null },
      };
    }

    const groupIds = adminMemberships.map((m) => m.group_id);

    // Check if any of these groups are unapproved
    const { data: unapprovedGroups, error: groupError } = await supabase
      .from('groups')
      .select('id, approved')
      .in('id', groupIds)
      .eq('approved', false)
      .limit(1);

    if (groupError) throw groupError;

    if (unapprovedGroups && unapprovedGroups.length > 0) {
      return {
        success: true,
        data: {
          hasUnapprovedGroup: true,
          unapprovedGroupId: unapprovedGroups[0].id,
        },
      };
    }

    return {
      success: true,
      data: { hasUnapprovedGroup: false, unapprovedGroupId: null },
    };
  } catch (error) {
    console.error('Failed to check group approval status:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to check status',
    };
  }
}
