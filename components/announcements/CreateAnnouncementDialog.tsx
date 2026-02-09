'use client';

import { useState, useEffect } from 'react';
import { createAnnouncement } from '@/actions/announcements';
import { getGroupTags, Tag } from '@/actions/tags';
import { createClient } from '@/lib/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { TimePicker } from '@/components/ui/time-picker';
import { Loader2, AlertCircle, Image as ImageIcon, X } from 'lucide-react';

interface CreateAnnouncementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: string;
  onSuccess: () => void;
}

export function CreateAnnouncementDialog({
  open,
  onOpenChange,
  groupId,
  onSuccess,
}: CreateAnnouncementDialogProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [deadlineDate, setDeadlineDate] = useState('');
  const [deadlineTime, setDeadlineTime] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  // Load tags when dialog opens
  useEffect(() => {
    if (open) {
      loadTags();
    }
  }, [open, groupId]);

  async function loadTags() {
    const result = await getGroupTags(groupId);
    if (result.success && result.data) {
      setAvailableTags(result.data);
    }
  }

  function toggleTag(tagId: string) {
    setSelectedTagIds((prev) =>
      prev.includes(tagId)
        ? prev.filter((id) => id !== tagId)
        : [...prev, tagId]
    );
  }

  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    // Validate file size (4MB max)
    const maxSize = 4 * 1024 * 1024; // 4MB in bytes
    if (file.size > maxSize) {
      setError('Image must be less than 4MB');
      return;
    }

    setImageFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
    setError('');
  }

  function removeImage() {
    setImageFile(null);
    setImagePreview(null);
  }

  async function uploadImage(): Promise<string | null> {
    if (!imageFile) return null;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Create unique filename
      const fileExt = imageFile.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('announcement-images')
        .upload(fileName, imageFile, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) throw error;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('announcement-images')
        .getPublicUrl(data.path);

      return publicUrl;
    } catch (err) {
      console.error('Image upload error:', err);
      throw err;
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!title.trim()) {
      setError('Title is required');
      return;
    }

    if (!content.trim()) {
      setError('Content is required');
      return;
    }

    setLoading(true);

    try {
      // Upload image first if provided
      let imageUrl: string | undefined;
      if (imageFile) {
        imageUrl = await uploadImage() || undefined;
      }

      // Combine date and time into datetime string if both are provided
      let deadline: string | undefined = undefined;
      if (deadlineDate) {
        if (deadlineTime) {
          deadline = `${deadlineDate}T${deadlineTime}`;
        } else {
          // If only date is provided, default to 23:59
          deadline = `${deadlineDate}T23:59`;
        }
      }

      const result = await createAnnouncement({
        groupId,
        title: title.trim(),
        content: content.trim(),
        deadline,
        imageUrl,
        tagIds: selectedTagIds.length > 0 ? selectedTagIds : undefined,
      });

      if (!result.success) {
        setError(result.error || 'Failed to create announcement');
        return;
      }

      // Success - reset form and close
      setTitle('');
      setContent('');
      setDeadlineDate('');
      setDeadlineTime('');
      setSelectedTagIds([]);
      removeImage();
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      console.error('Create announcement error:', err);
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create Announcement</DialogTitle>
            <DialogDescription>
              Share an update or important information with group members
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                placeholder="e.g., Meeting Tomorrow, New Policy Update"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={loading}
                maxLength={200}
                required
              />
              <p className="text-xs text-muted-foreground">
                {title.length}/200 characters
              </p>
            </div>

            {/* Content */}
            <div className="space-y-2">
              <Label htmlFor="content">Content *</Label>
              <Textarea
                id="content"
                placeholder="Write your announcement here..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                disabled={loading}
                rows={6}
                maxLength={5000}
                required
              />
              <p className="text-xs text-muted-foreground">
                {content.length}/5000 characters
              </p>
            </div>

            {/* Deadline (Optional) */}
            <div className="space-y-3">
              <Label>Deadline (Optional)</Label>

              <div className="grid gap-3 sm:grid-cols-2">
                {/* Date */}
                <div>
                  <Label htmlFor="deadlineDate" className="text-xs text-muted-foreground">
                    Date
                  </Label>
                  <Input
                    id="deadlineDate"
                    type="date"
                    value={deadlineDate}
                    onChange={(e) => setDeadlineDate(e.target.value)}
                    disabled={loading}
                    className="mt-1"
                  />
                </div>

                {/* Time */}
                <div>
                  <Label htmlFor="deadlineTime" className="text-xs text-muted-foreground">
                    Time
                  </Label>
                  <div className="mt-1">
                    <TimePicker
                      value={deadlineTime}
                      onChange={setDeadlineTime}
                      disabled={loading}
                    />
                  </div>
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                {deadlineDate && !deadlineTime
                  ? 'No time specified - will default to 11:59 PM'
                  : 'Set a deadline for time-sensitive announcements'}
              </p>
            </div>

            {/* Tags (Optional) */}
            {availableTags.length > 0 && (
              <div className="space-y-2">
                <Label>Tags (Optional)</Label>
                <div className="flex flex-wrap gap-2">
                  {availableTags.map((tag) => (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => toggleTag(tag.id)}
                      disabled={loading}
                      className="inline-flex items-center px-3 py-1.5 rounded text-sm font-medium transition-all hover:scale-105"
                      style={{
                        backgroundColor: selectedTagIds.includes(tag.id)
                          ? tag.color
                          : tag.color + '20',
                        color: selectedTagIds.includes(tag.id)
                          ? '#ffffff'
                          : tag.color,
                        borderColor: tag.color,
                        borderWidth: '1px',
                      }}
                    >
                      {tag.title}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Select tags to categorize your announcement
                </p>
              </div>
            )}

            {/* Image Upload (Optional) */}
            <div className="space-y-2">
              <Label htmlFor="image">Image (Optional)</Label>
              {!imagePreview ? (
                <div className="flex items-center gap-2">
                  <Input
                    id="image"
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelect}
                    disabled={loading}
                    className="cursor-pointer"
                  />
                </div>
              ) : (
                <div className="relative">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-full h-48 object-cover rounded-lg border"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2"
                    onClick={removeImage}
                    disabled={loading}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                PNG, JPG, GIF or WebP (max 4MB)
              </p>
            </div>

            {/* Error */}
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Announcement'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
