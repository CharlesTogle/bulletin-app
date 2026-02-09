'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import MDEditor from '@uiw/react-md-editor';
import { useServerActionWithParams } from '@/lib/hooks/useServerAction';
import { createAnnouncement } from '@/actions/announcements';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface CreateAnnouncementFormProps {
  groupId: string;
  onSuccess?: () => void;
}

export function CreateAnnouncementForm({
  groupId,
  onSuccess,
}: CreateAnnouncementFormProps) {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [deadline, setDeadline] = useState('');

  const { isLoading, error, execute } = useServerActionWithParams(
    createAnnouncement,
    {
      key: `create-announcement-${groupId}`,
      onSuccess: () => {
        // Reset form
        setTitle('');
        setContent('');
        setDeadline('');

        if (onSuccess) {
          onSuccess();
        } else {
          router.push(`/groups/${groupId}`);
        }
      },
      onError: (error) => {
        alert(`Failed to create announcement: ${error}`);
      },
    }
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!title.trim() || !content.trim()) {
      alert('Title and content are required');
      return;
    }

    await execute({
      groupId,
      title: title.trim(),
      content: content.trim(),
      deadline: deadline || undefined,
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create Announcement</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium mb-2">
              Title *
            </label>
            <Input
              id="title"
              placeholder="Announcement title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              maxLength={200}
              disabled={isLoading}
            />
          </div>

          {/* Content (Markdown) */}
          <div>
            <label htmlFor="content" className="block text-sm font-medium mb-2">
              Content * (Markdown supported)
            </label>
            <div data-color-mode="light">
              <MDEditor
                value={content}
                onChange={(val) => setContent(val || '')}
                preview="edit"
                height={400}
                textareaProps={{
                  placeholder: 'Write your announcement...',
                  disabled: isLoading,
                }}
              />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {content.length} / 50,000 characters
            </p>
          </div>

          {/* Deadline (Optional) */}
          <div>
            <label htmlFor="deadline" className="block text-sm font-medium mb-2">
              Deadline (Optional)
            </label>
            <Input
              id="deadline"
              type="datetime-local"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              disabled={isLoading}
            />
          </div>

          {/* Error Display */}
          {error && (
            <div className="rounded-md bg-destructive/10 p-3">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {/* Submit Button */}
          <div className="flex gap-2">
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Creating...' : 'Create Announcement'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={isLoading}
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
