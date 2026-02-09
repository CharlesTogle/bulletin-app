'use server';

import { createClient } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

export interface Tag {
  id: string;
  group_id: string;
  title: string;
  color: string;
  created_at: string;
  created_by: string;
  usage_count?: number;
}

export interface CreateTagData {
  groupId: string;
  title: string;
  color: string;
}

export interface UpdateTagData {
  tagId: string;
  title?: string;
  color?: string;
}

// Get all tags for a group
export async function getGroupTags(groupId: string) {
  try {
    await requireAuth();

    const supabase = await createClient();
    const { data, error } = await supabase
      .rpc('get_group_tags', { group_id_param: groupId });

    if (error) throw error;
    return { success: true, data: data as Tag[] };
  } catch (error: any) {
    console.error('Get group tags error:', error);
    return { success: false, error: error.message || 'Failed to fetch tags' };
  }
}

// Create a new tag (admin only)
export async function createTag(tagData: CreateTagData) {
  try {
    const user = await requireAuth();

    const supabase = await createClient();
    const { data: tag, error } = await supabase
      .from('tags')
      .insert({
        group_id: tagData.groupId,
        title: tagData.title.trim(),
        color: tagData.color,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) throw error;

    revalidatePath(`/groups/${tagData.groupId}`);
    return { success: true, data: tag };
  } catch (error: any) {
    console.error('Create tag error:', error);
    return { success: false, error: error.message || 'Failed to create tag' };
  }
}

// Update a tag (admin only)
export async function updateTag(tagData: UpdateTagData) {
  try {
    await requireAuth();

    const updateData: any = {};
    if (tagData.title !== undefined) updateData.title = tagData.title.trim();
    if (tagData.color !== undefined) updateData.color = tagData.color;

    const supabase = await createClient();
    const { data: tag, error } = await supabase
      .from('tags')
      .update(updateData)
      .eq('id', tagData.tagId)
      .select()
      .single();

    if (error) throw error;

    revalidatePath(`/groups/${tag.group_id}`);
    return { success: true, data: tag };
  } catch (error: any) {
    console.error('Update tag error:', error);
    return { success: false, error: error.message || 'Failed to update tag' };
  }
}

// Delete a tag (admin only)
export async function deleteTag(tagId: string) {
  try {
    await requireAuth();

    const supabase = await createClient();

    // Get group_id before deleting
    const { data: tag } = await supabase
      .from('tags')
      .select('group_id')
      .eq('id', tagId)
      .single();

    const { error } = await supabase
      .from('tags')
      .delete()
      .eq('id', tagId);

    if (error) throw error;

    if (tag?.group_id) {
      revalidatePath(`/groups/${tag.group_id}`);
    }

    return { success: true };
  } catch (error: any) {
    console.error('Delete tag error:', error);
    return { success: false, error: error.message || 'Failed to delete tag' };
  }
}

// Add tags to an announcement
export async function addTagsToAnnouncement(announcementId: string, tagIds: string[]) {
  try {
    await requireAuth();

    const supabase = await createClient();

    // Insert tags
    const tagsToInsert = tagIds.map(tagId => ({
      announcement_id: announcementId,
      tag_id: tagId,
    }));

    const { error } = await supabase
      .from('announcement_tags')
      .insert(tagsToInsert);

    if (error) throw error;

    // Get group_id for revalidation
    const { data: announcement } = await supabase
      .from('announcements')
      .select('group_id')
      .eq('id', announcementId)
      .single();

    if (announcement?.group_id) {
      revalidatePath(`/groups/${announcement.group_id}`);
    }

    return { success: true };
  } catch (error: any) {
    console.error('Add tags error:', error);
    return { success: false, error: error.message || 'Failed to add tags' };
  }
}

// Remove tags from an announcement
export async function removeTagsFromAnnouncement(announcementId: string, tagIds: string[]) {
  try {
    await requireAuth();

    const supabase = await createClient();

    const { error } = await supabase
      .from('announcement_tags')
      .delete()
      .eq('announcement_id', announcementId)
      .in('tag_id', tagIds);

    if (error) throw error;

    // Get group_id for revalidation
    const { data: announcement } = await supabase
      .from('announcements')
      .select('group_id')
      .eq('id', announcementId)
      .single();

    if (announcement?.group_id) {
      revalidatePath(`/groups/${announcement.group_id}`);
    }

    return { success: true };
  } catch (error: any) {
    console.error('Remove tags error:', error);
    return { success: false, error: error.message || 'Failed to remove tags' };
  }
}

// Get tags for a specific announcement
export async function getAnnouncementTags(announcementId: string) {
  try {
    await requireAuth();

    const supabase = await createClient();
    const { data, error } = await supabase
      .rpc('get_announcement_tags', { announcement_id_param: announcementId });

    if (error) throw error;
    return { success: true, data: data as Tag[] };
  } catch (error: any) {
    console.error('Get announcement tags error:', error);
    return { success: false, error: error.message || 'Failed to fetch announcement tags' };
  }
}
