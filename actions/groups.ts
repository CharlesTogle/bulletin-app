'use server';

import { createClient, createAdminClient } from '@/lib/supabase/server';
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

    // Regular users: Get groups where user is a member with their role
    const { data: memberGroups, error: memberError } = await supabase
      .from('group_members')
      .select('group_id, role')
      .eq('user_id', user.id);

    if (memberError) throw memberError;

    const groupIds = memberGroups?.map((m) => m.group_id) || [];

    if (groupIds.length === 0) {
      return { success: true, data: [] };
    }

    // Create a map of group_id -> role for quick lookup
    const roleMap = memberGroups?.reduce((acc, m) => {
      acc[m.group_id] = m.role;
      return acc;
    }, {} as Record<string, string>) || {};

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

    // Include user's role in each group
    const formattedData = data?.map((g: any) => ({
      ...g,
      member_count: 0,
      admin_count: 0,
      user_role: roleMap[g.id], // Add user's role
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

    // Debug: Verify user with getUser() (more secure than getSession)
    const { data: { user: verifiedUser }, error: userError } = await supabase.auth.getUser();
    console.log('[createGroup] User verification:', {
      verified: !!verifiedUser,
      userId: verifiedUser?.id,
      error: userError
    });

    if (!verifiedUser) {
      throw new Error('User verification failed - session may be invalid');
    }

    // Generate unique group code
    const { data: codeData, error: codeError } = await supabase.rpc(
      'generate_group_code',
      { length: 8 }
    );

    if (codeError) {
      console.error('[createGroup] Code generation error:', codeError);
      throw codeError;
    }

    console.log('[createGroup] Generated code:', codeData);

    // Create group using SECURITY DEFINER function (workaround for RLS issue)
    const { data: group, error } = await supabase.rpc('create_group_safe', {
      p_creator_id: user.id,
      p_name: data.name,
      p_code: codeData,
      p_description: data.description || null,
    });

    if (error) {
      console.error('[createGroup] Group creation error:', error);
      throw error;
    }

    // The RPC returns an array with one row, get the first item
    const createdGroup = Array.isArray(group) ? group[0] : group;

    if (!createdGroup) {
      throw new Error('Failed to create group - no data returned');
    }

    console.log('[createGroup] Group created successfully:', createdGroup.id);

    revalidatePath('/groups');

    return { success: true, data: createdGroup as Group };
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
    console.log('[joinGroup] Starting for code:', groupCode);
    await requireAuth();

    const supabase = await createClient();

    // Use SECURITY DEFINER function to bypass RLS and join group
    console.log('[joinGroup] Calling join_group_by_code function...');
    const { data: group, error } = await supabase.rpc('join_group_by_code', {
      p_group_code: groupCode.trim().toUpperCase()
    });

    if (error) {
      console.error('[joinGroup] Error:', error);
      // Return user-friendly error message
      return {
        success: false,
        error: error.message || 'Failed to join group'
      };
    }

    // The RPC returns an array with one row
    const joinedGroup = Array.isArray(group) ? group[0] : group;

    if (!joinedGroup) {
      return {
        success: false,
        error: 'Failed to join group - no data returned'
      };
    }

    console.log('[joinGroup] Successfully joined group:', joinedGroup.id);
    revalidatePath('/groups');

    return { success: true, data: joinedGroup as Group };
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

// ============================================================================
// MEMBER MANAGEMENT
// ============================================================================

/**
 * Get all members of a group
 */
export async function getGroupMembers(
  groupId: string,
  options?: {
    page?: number;
    pageSize?: number;
    sortBy?: 'joined_at' | 'email' | 'role';
    sortOrder?: 'asc' | 'desc';
  }
): Promise<ActionResponse<{
  data: Array<{
    id: string;
    user_id: string;
    role: 'admin' | 'contributor' | 'member';
    joined_at: string;
    email: string;
  }>;
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}>> {
  try {
    const user = await requireAuth();
    const supabase = await createClient();

    // Check if user is a member of the group
    const { data: membership } = await supabase
      .from('group_members')
      .select('role')
      .eq('group_id', groupId)
      .eq('user_id', user.id)
      .single();

    if (!membership) {
      return { success: false, error: 'You are not a member of this group' };
    }

    // Pagination defaults
    const page = options?.page || 1;
    const pageSize = options?.pageSize || 20;
    const sortBy = options?.sortBy || 'joined_at';
    const sortOrder = options?.sortOrder || 'asc';

    // Get all members with count for pagination
    let query = supabase
      .from('group_members')
      .select(`
        id,
        user_id,
        role,
        joined_at
      `, { count: 'exact' })
      .eq('group_id', groupId);

    // Apply sorting (email sorting will be done in-memory after fetching emails)
    if (sortBy !== 'email') {
      query = query.order(sortBy, { ascending: sortOrder === 'asc' });
    }

    // Apply pagination
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data: members, error, count } = await query;

    if (error) throw error;

    // Get user emails using admin client
    const adminClient = createAdminClient();
    const userIds = members?.map(m => m.user_id) || [];
    const { data: { users } } = await adminClient.auth.admin.listUsers();
    const userMap = users?.reduce((acc, u) => {
      acc[u.id] = u.email || 'Unknown';
      return acc;
    }, {} as Record<string, string>) || {};

    let membersWithEmails = members?.map(m => ({
      ...m,
      email: userMap[m.user_id] || 'Unknown',
    })) || [];

    // Sort by email if requested (in-memory)
    if (sortBy === 'email') {
      membersWithEmails.sort((a, b) => {
        if (sortOrder === 'asc') {
          return a.email.localeCompare(b.email);
        } else {
          return b.email.localeCompare(a.email);
        }
      });
    }

    const total = count || 0;
    const totalPages = Math.ceil(total / pageSize);

    return {
      success: true,
      data: {
        data: membersWithEmails,
        total,
        page,
        pageSize,
        totalPages,
      },
    };
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
 * Note: Admins can only promote members to contributor or demote to member.
 * They cannot promote other members to admin.
 */
export async function updateMemberRole(
  groupId: string,
  memberId: string,
  newRole: 'contributor' | 'member'
): Promise<ActionResponse<void>> {
  try {
    const user = await requireAuth();
    const supabase = await createClient();

    // Check if current user is an admin
    const { data: currentUserMembership } = await supabase
      .from('group_members')
      .select('role')
      .eq('group_id', groupId)
      .eq('user_id', user.id)
      .single();

    if (!currentUserMembership || currentUserMembership.role !== 'admin') {
      return { success: false, error: 'Only admins can change member roles' };
    }

    // Get the target member's user_id
    const { data: targetMember } = await supabase
      .from('group_members')
      .select('user_id')
      .eq('id', memberId)
      .single();

    // Prevent users from changing their own role
    if (targetMember?.user_id === user.id) {
      return {
        success: false,
        error: 'You cannot change your own role',
      };
    }

    // Update the role
    const { data, error } = await supabase
      .from('group_members')
      .update({ role: newRole })
      .eq('id', memberId)
      .select();

    console.log('Update result:', { data, error, memberId, newRole });

    if (error) throw error;

    revalidatePath(`/groups/${groupId}`);

    return { success: true, data: undefined };
  } catch (error) {
    console.error('Failed to update member role:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update role',
    };
  }
}
