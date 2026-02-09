'use client';

import { useState, useEffect } from 'react';
import { getGroupTags, createTag, updateTag, deleteTag, Tag } from '@/actions/tags';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ColorPicker } from '@/components/ui/color-picker';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Plus, Trash2, Pencil, X, Check, AlertCircle } from 'lucide-react';

interface TagManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: string;
}

export function TagManagementDialog({
  open,
  onOpenChange,
  groupId,
}: TagManagementDialogProps) {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Create new tag
  const [newTagTitle, setNewTagTitle] = useState('');
  const [newTagColor, setNewTagColor] = useState('#3b82f6');
  const [creating, setCreating] = useState(false);

  // Edit existing tag
  const [editingTagId, setEditingTagId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editColor, setEditColor] = useState('');

  useEffect(() => {
    if (open) {
      loadTags();
    }
  }, [open, groupId]);

  async function loadTags() {
    setLoading(true);
    setError('');
    try {
      const result = await getGroupTags(groupId);
      if (result.success && result.data) {
        setTags(result.data);
      } else {
        setError(result.error || 'Failed to load tags');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateTag() {
    if (!newTagTitle.trim()) {
      setError('Tag title is required');
      return;
    }

    setCreating(true);
    setError('');
    try {
      const result = await createTag({
        groupId,
        title: newTagTitle.trim(),
        color: newTagColor,
      });

      if (result.success) {
        setNewTagTitle('');
        setNewTagColor('#3b82f6');
        loadTags();
      } else {
        setError(result.error || 'Failed to create tag');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setCreating(false);
    }
  }

  async function handleUpdateTag(tagId: string) {
    if (!editTitle.trim()) {
      setError('Tag title is required');
      return;
    }

    setError('');
    try {
      const result = await updateTag({
        tagId,
        title: editTitle.trim(),
        color: editColor,
      });

      if (result.success) {
        setEditingTagId(null);
        loadTags();
      } else {
        setError(result.error || 'Failed to update tag');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    }
  }

  async function handleDeleteTag(tagId: string) {
    if (!confirm('Are you sure you want to delete this tag? It will be removed from all announcements.')) {
      return;
    }

    setError('');
    try {
      const result = await deleteTag(tagId);
      if (result.success) {
        loadTags();
      } else {
        setError(result.error || 'Failed to delete tag');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    }
  }

  function startEditing(tag: Tag) {
    setEditingTagId(tag.id);
    setEditTitle(tag.title);
    setEditColor(tag.color);
    setError('');
  }

  function cancelEditing() {
    setEditingTagId(null);
    setEditTitle('');
    setEditColor('');
    setError('');
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage Tags</DialogTitle>
          <DialogDescription>
            Create and manage tags for announcements. Only admins can manage tags.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Create New Tag */}
          <div className="border rounded-lg p-4 space-y-4">
            <h3 className="font-medium">Create New Tag</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="newTagTitle">Title *</Label>
                <Input
                  id="newTagTitle"
                  placeholder="e.g., Urgent, Important"
                  value={newTagTitle}
                  onChange={(e) => setNewTagTitle(e.target.value)}
                  maxLength={50}
                  disabled={creating}
                />
              </div>
              <div className="space-y-2">
                <Label>Color</Label>
                <ColorPicker
                  value={newTagColor}
                  onChange={setNewTagColor}
                  disabled={creating}
                />
              </div>
            </div>
            <Button
              onClick={handleCreateTag}
              disabled={creating || !newTagTitle.trim()}
              className="w-full"
            >
              {creating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Tag
                </>
              )}
            </Button>
          </div>

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Existing Tags */}
          <div className="space-y-2">
            <h3 className="font-medium">Existing Tags ({tags.length})</h3>

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : tags.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No tags yet. Create one above.
              </p>
            ) : (
              <div className="space-y-2">
                {tags.map((tag) => (
                  <div
                    key={tag.id}
                    className="flex items-center gap-2 p-3 border rounded-lg"
                  >
                    {editingTagId === tag.id ? (
                      <>
                        <Input
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          className="flex-1"
                          maxLength={50}
                        />
                        <ColorPicker
                          value={editColor}
                          onChange={setEditColor}
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleUpdateTag(tag.id)}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={cancelEditing}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <div
                          className="w-4 h-4 rounded-full border"
                          style={{ backgroundColor: tag.color }}
                        />
                        <span className="flex-1 font-medium">{tag.title}</span>
                        {tag.usage_count !== undefined && (
                          <span className="text-xs text-muted-foreground">
                            {tag.usage_count} use{tag.usage_count !== 1 ? 's' : ''}
                          </span>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => startEditing(tag)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteTag(tag.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
