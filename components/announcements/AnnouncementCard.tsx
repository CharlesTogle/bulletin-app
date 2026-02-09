'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Pin, Calendar, Trash2, Edit } from 'lucide-react';
import { useServerActionWithParams } from '@/lib/hooks/useServerAction';
import { deleteAnnouncement } from '@/actions/announcements';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { AnnouncementWithDetails } from '@/types/database';

interface AnnouncementCardProps {
  announcement: AnnouncementWithDetails;
  canEdit?: boolean;
  canDelete?: boolean;
  onEdit?: () => void;
  onDeleted?: () => void;
}

export function AnnouncementCard({
  announcement,
  canEdit = false,
  canDelete = false,
  onEdit,
  onDeleted,
}: AnnouncementCardProps) {
  const [showConfirm, setShowConfirm] = useState(false);

  const { isLoading, execute: executeDelete } = useServerActionWithParams(
    deleteAnnouncement,
    {
      key: `delete-announcement-${announcement.id}`,
      onSuccess: () => {
        onDeleted?.();
      },
      onError: (error) => {
        alert(`Failed to delete: ${error}`);
      },
    }
  );

  async function handleDelete() {
    if (showConfirm) {
      await executeDelete(announcement.id);
    } else {
      setShowConfirm(true);
      setTimeout(() => setShowConfirm(false), 3000);
    }
  }

  return (
    <Card className={announcement.is_pinned ? 'border-primary' : ''}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              {announcement.is_pinned && (
                <Pin className="h-4 w-4 text-primary" />
              )}
              <CardTitle className="text-xl">{announcement.title}</CardTitle>
            </div>

            <div className="flex flex-wrap gap-2 items-center text-sm text-muted-foreground">
              <span>By {announcement.author_email}</span>
              <span>•</span>
              <span>{new Date(announcement.created_at).toLocaleDateString()}</span>

              {announcement.deadline && (
                <>
                  <span>•</span>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    <span>
                      Due: {new Date(announcement.deadline).toLocaleDateString()}
                    </span>
                  </div>
                </>
              )}
            </div>

            {/* Category & Tags */}
            <div className="flex flex-wrap gap-2 mt-2">
              {announcement.category_name && (
                <Badge
                  variant="secondary"
                  style={{ backgroundColor: announcement.category_color || undefined }}
                >
                  {announcement.category_name}
                </Badge>
              )}
              {announcement.tag_names?.map((tag) => (
                <Badge key={tag} variant="outline">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>

          {/* Actions */}
          {(canEdit || canDelete) && (
            <div className="flex gap-2">
              {canEdit && onEdit && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onEdit}
                  disabled={isLoading}
                >
                  <Edit className="h-4 w-4" />
                </Button>
              )}
              {canDelete && (
                <Button
                  variant={showConfirm ? 'destructive' : 'ghost'}
                  size="sm"
                  onClick={handleDelete}
                  disabled={isLoading}
                >
                  <Trash2 className="h-4 w-4" />
                  {showConfirm && <span className="ml-1">Confirm?</span>}
                </Button>
              )}
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {/* Markdown Content */}
        <div className="prose prose-neutral dark:prose-invert max-w-none">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {announcement.content}
          </ReactMarkdown>
        </div>

        {/* Vote Display */}
        <div className="mt-4 flex items-center gap-4 text-sm text-muted-foreground">
          <span>👍 {announcement.upvotes_count} upvotes</span>
          <span>👎 {announcement.downvotes_count} downvotes</span>
          <span>Score: {announcement.net_votes}</span>
        </div>
      </CardContent>
    </Card>
  );
}
