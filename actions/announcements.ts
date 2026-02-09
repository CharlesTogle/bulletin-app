'use server';

import { createClient } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/auth';
import {
  requireGroupRole,
  canModifyAnnouncement,
  getUserGroupRole,
} from '@/lib/auth/permissions';
import { revalidatePath } from 'next/cache';
import type { Announcement, AnnouncementWithDetails, ActionResponse } from '@/types/database';

/**
 * Server Actions for Announcements
 *
 * All actions include automatic role verification
 */

// ============================================================================
// CREATE ANNOUNCEMENT (Admin, Contributor)
// ============================================================================

export async function createAnnouncement(data: {
  groupId: string;
  title: string;
  content: string;
  categoryId?: string;
  tagIds?: string[];
  deadline?: string; // ISO 8601 string
  imageUrl?: string;
}): Promise<ActionResponse<Announcement>> {
  try {
    const user = await requireAuth();

    // Verify user has permission to create announcements
    await requireGroupRole(
      data.groupId,
      ['admin', 'contributor'],
      'Only admins and contributors can create announcements'
    );

    const supabase = await createClient();

    // Create announcement
    const { data: announcement, error } = await supabase
      .from('announcements')
      .insert({
        group_id: data.groupId,
        author_id: user.id,
        title: data.title,
        content: data.content,
        category_id: data.categoryId || null,
        deadline: data.deadline || null,
        image_url: data.imageUrl || null,
      })
      .select()
      .single();

    if (error) throw error;

    // Add tags if provided
    if (data.tagIds && data.tagIds.length > 0) {
      const tagInserts = data.tagIds.map((tagId) => ({
        announcement_id: announcement.id,
        tag_id: tagId,
      }));

      const { error: tagError } = await supabase
        .from('announcement_tags')
        .insert(tagInserts);

      if (tagError) {
        console.error('Failed to add tags:', tagError);
        // Don't fail the whole operation if tags fail
      }
    }

    revalidatePath(`/groups/${data.groupId}`);
    revalidatePath(`/groups/${data.groupId}/announcements`);

    return { success: true, data: announcement };
  } catch (error) {
    console.error('Failed to create announcement:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create announcement',
    };
  }
}

// ============================================================================
// UPDATE ANNOUNCEMENT (Author, Admin)
// ============================================================================

export async function updateAnnouncement(
  announcementId: string,
  data: {
    title?: string;
    content?: string;
    categoryId?: string;
    tagIds?: string[];
    deadline?: string | null;
    isPinned?: boolean;
    isArchived?: boolean;
  }
): Promise<ActionResponse<Announcement>> {
  try {
    await requireAuth();

    // Verify user can modify this announcement
    const { canModify, isAdmin } = await canModifyAnnouncement(announcementId);

    if (!canModify) {
      throw new Error('You do not have permission to edit this announcement');
    }

    const supabase = await createClient();

    // Build update object
    const updates: any = {};
    if (data.title !== undefined) updates.title = data.title;
    if (data.content !== undefined) updates.content = data.content;
    if (data.categoryId !== undefined) updates.category_id = data.categoryId || null;
    if (data.deadline !== undefined) updates.deadline = data.deadline;

    // Only admins can pin/archive
    if (isAdmin) {
      if (data.isPinned !== undefined) updates.is_pinned = data.isPinned;
      if (data.isArchived !== undefined) updates.is_archived = data.isArchived;
    }

    // Update announcement
    const { data: announcement, error } = await supabase
      .from('announcements')
      .update(updates)
      .eq('id', announcementId)
      .select()
      .single();

    if (error) throw error;

    // Update tags if provided
    if (data.tagIds !== undefined) {
      // Remove existing tags
      await supabase
        .from('announcement_tags')
        .delete()
        .eq('announcement_id', announcementId);

      // Add new tags
      if (data.tagIds.length > 0) {
        const tagInserts = data.tagIds.map((tagId) => ({
          announcement_id: announcementId,
          tag_id: tagId,
        }));

        await supabase.from('announcement_tags').insert(tagInserts);
      }
    }

    revalidatePath(`/groups/${announcement.group_id}`);
    revalidatePath(`/groups/${announcement.group_id}/announcements`);
    revalidatePath(`/announcements/${announcementId}`);

    return { success: true, data: announcement };
  } catch (error) {
    console.error('Failed to update announcement:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update announcement',
    };
  }
}

// ============================================================================
// DELETE ANNOUNCEMENT (Author, Admin)
// ============================================================================

export async function deleteAnnouncement(
  announcementId: string
): Promise<ActionResponse<void>> {
  try {
    await requireAuth();

    // Get announcement to check group
    const supabase = await createClient();
    const { data: announcement, error: fetchError } = await supabase
      .from('announcements')
      .select('group_id')
      .eq('id', announcementId)
      .single();

    if (fetchError || !announcement) {
      throw new Error('Announcement not found');
    }

    // Verify user can modify this announcement
    const { canModify } = await canModifyAnnouncement(announcementId);

    if (!canModify) {
      throw new Error('You do not have permission to delete this announcement');
    }

    // Delete announcement (cascade will delete tags, votes, attachments)
    const { error } = await supabase
      .from('announcements')
      .delete()
      .eq('id', announcementId);

    if (error) throw error;

    revalidatePath(`/groups/${announcement.group_id}`);
    revalidatePath(`/groups/${announcement.group_id}/announcements`);

    return { success: true, data: undefined };
  } catch (error) {
    console.error('Failed to delete announcement:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete announcement',
    };
  }
}

// ============================================================================
// GET ANNOUNCEMENTS (All Members)
// ============================================================================

export async function getGroupAnnouncements(
  groupId: string,
  options?: {
    includeArchived?: boolean;
    categoryId?: string;
    tagId?: string;
    page?: number;
    pageSize?: number;
    sortBy?: 'created_at' | 'deadline';
    sortOrder?: 'asc' | 'desc';
  }
): Promise<ActionResponse<{
  data: AnnouncementWithDetails[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}>> {
  try {
    await requireAuth();

    // Verify user is a member
    const { isMember, role } = await getUserGroupRole(groupId);
    if (!isMember) {
      throw new Error('You are not a member of this group');
    }

    const supabase = await createClient();

    // Pagination defaults
    const page = options?.page || 1;
    const pageSize = options?.pageSize || 10;
    const sortBy = options?.sortBy || 'created_at';
    const sortOrder = options?.sortOrder || 'desc';

    // Build base query
    let query = supabase
      .from('announcements_with_details')
      .select('*', { count: 'exact' })
      .eq('group_id', groupId);

    // Non-admins can't see archived announcements
    if (!options?.includeArchived || role !== 'admin') {
      query = query.eq('is_archived', false);
    }

    // Filter by category
    if (options?.categoryId) {
      query = query.eq('category_id', options.categoryId);
    }

    // Filter by tag (requires joining)
    if (options?.tagId) {
      const { data: announcementIds } = await supabase
        .from('announcement_tags')
        .select('announcement_id')
        .eq('tag_id', options.tagId);

      if (announcementIds && announcementIds.length > 0) {
        const ids = announcementIds.map((a) => a.announcement_id);
        query = query.in('id', ids);
      } else {
        return {
          success: true,
          data: {
            data: [],
            total: 0,
            page,
            pageSize,
            totalPages: 0,
          },
        };
      }
    }

    // Sorting - pinned always first, then by selected field
    query = query
      .order('is_pinned', { ascending: false })
      .order(sortBy, { ascending: sortOrder === 'asc' });

    // Apply pagination
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) throw error;

    // Get current user ID
    const user = await requireAuth();

    // Fetch user's votes for these announcements
    const announcementIds = data?.map(a => a.id) || [];
    const { data: votes } = await supabase
      .from('votes')
      .select('announcement_id, vote_type')
      .eq('user_id', user.id)
      .in('announcement_id', announcementIds);

    // Create a map of announcement_id -> vote_type
    const voteMap = votes?.reduce((acc, vote) => {
      acc[vote.announcement_id] = vote.vote_type;
      return acc;
    }, {} as Record<string, string>) || {};

    // Add user_vote to each announcement
    const dataWithVotes = data?.map(announcement => ({
      ...announcement,
      user_vote: voteMap[announcement.id] || null,
    }));

    const total = count || 0;
    const totalPages = Math.ceil(total / pageSize);

    return {
      success: true,
      data: {
        data: dataWithVotes as AnnouncementWithDetails[],
        total,
        page,
        pageSize,
        totalPages,
      },
    };
  } catch (error) {
    console.error('Failed to get announcements:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch announcements',
    };
  }
}

// ============================================================================
// GET PINNED ANNOUNCEMENTS (All Members)
// ============================================================================

/**
 * Get all pinned announcements for a group (not paginated)
 */
export async function getPinnedAnnouncements(
  groupId: string
): Promise<ActionResponse<AnnouncementWithDetails[]>> {
  try {
    await requireAuth();

    // Verify user is a member
    const { isMember } = await getUserGroupRole(groupId);
    if (!isMember) {
      throw new Error('You are not a member of this group');
    }

    const supabase = await createClient();
    const user = await requireAuth();

    // Get pinned announcements
    const { data, error } = await supabase
      .from('announcements_with_details')
      .select('*')
      .eq('group_id', groupId)
      .eq('is_pinned', true)
      .eq('is_archived', false)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Fetch user's votes for these announcements
    const announcementIds = data?.map(a => a.id) || [];
    const { data: votes } = await supabase
      .from('votes')
      .select('announcement_id, vote_type')
      .eq('user_id', user.id)
      .in('announcement_id', announcementIds);

    const voteMap = votes?.reduce((acc, vote) => {
      acc[vote.announcement_id] = vote.vote_type;
      return acc;
    }, {} as Record<string, string>) || {};

    const dataWithVotes = data?.map(announcement => ({
      ...announcement,
      user_vote: voteMap[announcement.id] || null,
    }));

    return { success: true, data: dataWithVotes as AnnouncementWithDetails[] };
  } catch (error) {
    console.error('Failed to get pinned announcements:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch pinned announcements',
    };
  }
}

// ============================================================================
// GET SINGLE ANNOUNCEMENT (All Members)
// ============================================================================

export async function getAnnouncement(
  announcementId: string
): Promise<ActionResponse<AnnouncementWithDetails>> {
  try {
    await requireAuth();

    const supabase = await createClient();

    // RLS will automatically filter if user has access
    const { data, error } = await supabase
      .from('announcements_with_details')
      .select('*')
      .eq('id', announcementId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        throw new Error('Announcement not found or you do not have access');
      }
      throw error;
    }

    return { success: true, data: data as AnnouncementWithDetails };
  } catch (error) {
    console.error('Failed to get announcement:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch announcement',
    };
  }
}

// ============================================================================
// CHECK USER PERMISSIONS (Helper for UI)
// ============================================================================

export async function checkAnnouncementPermissions(announcementId: string): Promise<
  ActionResponse<{
    canEdit: boolean;
    canDelete: boolean;
    canPin: boolean;
    canArchive: boolean;
    isAuthor: boolean;
    isAdmin: boolean;
  }>
> {
  try {
    await requireAuth();

    const { canModify, isAuthor, isAdmin } = await canModifyAnnouncement(announcementId);

    return {
      success: true,
      data: {
        canEdit: canModify,
        canDelete: canModify,
        canPin: isAdmin,
        canArchive: isAdmin,
        isAuthor,
        isAdmin,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to check permissions',
    };
  }
}

// ============================================================================
// VOTE ON ANNOUNCEMENT (All Members)
// ============================================================================

/**
 * Vote on an announcement (upvote or downvote)
 * Clicking the same vote type again removes the vote
 */
export async function voteAnnouncement(
  announcementId: string,
  voteType: 'upvote' | 'downvote'
): Promise<ActionResponse<void>> {
  try {
    const user = await requireAuth();
    const supabase = await createClient();

    // Check if user already voted
    const { data: existingVote } = await supabase
      .from('votes')
      .select('id, vote_type')
      .eq('announcement_id', announcementId)
      .eq('user_id', user.id)
      .single();

    if (existingVote) {
      // If same vote type, remove vote (toggle off)
      if (existingVote.vote_type === voteType) {
        const { error } = await supabase
          .from('votes')
          .delete()
          .eq('id', existingVote.id);

        if (error) throw error;
      } else {
        // Change vote type
        const { error } = await supabase
          .from('votes')
          .update({ vote_type: voteType, updated_at: new Date().toISOString() })
          .eq('id', existingVote.id);

        if (error) throw error;
      }
    } else {
      // Create new vote
      const { error } = await supabase
        .from('votes')
        .insert({
          announcement_id: announcementId,
          user_id: user.id,
          vote_type: voteType,
        });

      if (error) throw error;
    }

    // Get announcement to revalidate group page
    const { data: announcement } = await supabase
      .from('announcements')
      .select('group_id')
      .eq('id', announcementId)
      .single();

    if (announcement) {
      revalidatePath(`/groups/${announcement.group_id}`);
    }

    return { success: true, data: undefined };
  } catch (error) {
    console.error('Failed to vote:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to vote',
    };
  }
}

// ============================================================================
// PIN/UNPIN ANNOUNCEMENT (Admin & Contributor)
// ============================================================================

/**
 * Toggle pin status of an announcement
 * Admins and contributors can pin/unpin announcements
 */
export async function togglePinAnnouncement(
  announcementId: string
): Promise<ActionResponse<void>> {
  try {
    const user = await requireAuth();
    const supabase = await createClient();

    // Get announcement to check group and current pin status
    const { data: announcement, error: fetchError } = await supabase
      .from('announcements')
      .select('group_id, is_pinned')
      .eq('id', announcementId)
      .single();

    if (fetchError || !announcement) {
      return { success: false, error: 'Announcement not found' };
    }

    // Verify user is admin or contributor of the group
    await requireGroupRole(
      announcement.group_id,
      ['admin', 'contributor'],
      'Only admins and contributors can pin announcements'
    );

    // Toggle pin status
    const { error: updateError } = await supabase
      .from('announcements')
      .update({
        is_pinned: !announcement.is_pinned,
        updated_at: new Date().toISOString(),
      })
      .eq('id', announcementId);

    if (updateError) throw updateError;

    revalidatePath(`/groups/${announcement.group_id}`);

    return { success: true, data: undefined };
  } catch (error) {
    console.error('Failed to toggle pin:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to toggle pin',
    };
  }
}
