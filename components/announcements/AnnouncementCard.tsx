'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { voteAnnouncement, deleteAnnouncement } from '@/actions/announcements';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ThumbsUp,
  ThumbsDown,
  Pin,
  Calendar,
  User,
  Loader2,
  Trash2,
  MoreVertical
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface AnnouncementCardProps {
  announcement: any;
  userRole: 'admin' | 'contributor' | 'member' | null;
  onRefresh: () => void;
  onPin?: (announcementId: string) => Promise<void>;
  currentUserId?: string;
}

export function AnnouncementCard({
  announcement,
  userRole,
  onRefresh,
  onPin,
  currentUserId,
}: AnnouncementCardProps) {
  const [voting, setVoting] = useState(false);
  const [pinning, setPinning] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleVote(voteType: 'upvote' | 'downvote') {
    setVoting(true);
    try {
      const result = await voteAnnouncement(announcement.id, voteType);
      if (result.success) {
        onRefresh();
      } else {
        alert(result.error || 'Failed to vote');
      }
    } catch (err) {
      console.error('Vote error:', err);
    } finally {
      setVoting(false);
    }
  }

  async function handlePin() {
    if (!onPin) return;

    setPinning(true);
    try {
      await onPin(announcement.id);
      onRefresh();
    } catch (err) {
      console.error('Pin error:', err);
    } finally {
      setPinning(false);
    }
  }

  async function handleDelete() {
    if (!confirm('Are you sure you want to delete this announcement? This action cannot be undone.')) {
      return;
    }

    setDeleting(true);
    try {
      const result = await deleteAnnouncement(announcement.id);
      if (result.success) {
        onRefresh();
      } else {
        alert(result.error || 'Failed to delete announcement');
      }
    } catch (err) {
      console.error('Delete error:', err);
      alert('Failed to delete announcement');
    } finally {
      setDeleting(false);
    }
  }

  // Check if user can delete this announcement
  const isAuthor = currentUserId && announcement.author_id === currentUserId;
  const canDelete = userRole === 'admin' || isAuthor;

  const userVote = announcement.user_vote;
  const netVotes = (announcement.upvotes_count || 0) - (announcement.downvotes_count || 0);

  return (
    <Card className={announcement.is_pinned ? 'border-primary' : ''}>
      <CardHeader className="pb-3 px-4 sm:px-6">
        <div className="flex items-start justify-between gap-2 sm:gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {announcement.is_pinned && (
                <Pin className="h-4 w-4 text-primary flex-shrink-0" />
              )}
              <h3 className="font-semibold text-base sm:text-lg break-words">{announcement.title}</h3>
            </div>

            {/* Tags */}
            {announcement.tags && announcement.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-2">
                {announcement.tags.map((tag: any) => (
                  <span
                    key={tag.id}
                    className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
                    style={{
                      backgroundColor: tag.color + '20',
                      color: tag.color,
                      borderColor: tag.color,
                      borderWidth: '1px',
                    }}
                  >
                    {tag.title}
                  </span>
                ))}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-1.5 sm:gap-3 text-xs sm:text-sm text-muted-foreground">
              <span className="flex items-center gap-1 truncate max-w-[150px] sm:max-w-none">
                <User className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">{announcement.author_email || 'Unknown'}</span>
              </span>
              <span className="hidden sm:inline">•</span>
              <span className="hidden sm:inline">{new Date(announcement.created_at).toLocaleDateString()}</span>
              {announcement.deadline && (
                <>
                  <span className="hidden sm:inline">•</span>
                  <span className="flex items-center gap-1 text-amber-600">
                    <Calendar className="h-3 w-3 flex-shrink-0" />
                    <span className="hidden sm:inline">Due: </span>
                    {new Date(announcement.deadline).toLocaleDateString()}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Actions Menu (Admin & Author) */}
          {(canDelete || (userRole && ['admin', 'contributor'].includes(userRole) && onPin)) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" disabled={deleting || pinning} className="flex-shrink-0">
                  {deleting || pinning ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <MoreVertical className="h-4 w-4" />
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {/* Pin/Unpin option (Admin & Contributor) */}
                {userRole && ['admin', 'contributor'].includes(userRole) && onPin && (
                  <DropdownMenuItem onClick={handlePin} disabled={pinning}>
                    <Pin className={`h-4 w-4 mr-2 ${announcement.is_pinned ? 'fill-current' : ''}`} />
                    {announcement.is_pinned ? 'Unpin' : 'Pin'}
                  </DropdownMenuItem>
                )}

                {/* Delete option (Admin or Author) */}
                {canDelete && (
                  <DropdownMenuItem
                    onClick={handleDelete}
                    disabled={deleting}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3 sm:space-y-4 px-4 sm:px-6">
        {/* Image */}
        {announcement.image_url && (
          <div className="rounded-lg overflow-hidden border">
            <img
              src={announcement.image_url}
              alt={announcement.title}
              className="w-full h-auto max-h-64 sm:max-h-96 object-cover"
            />
          </div>
        )}

        {/* Content */}
        <div className="prose prose-sm sm:prose max-w-none dark:prose-invert [&_pre]:border-0 [&_pre]:bg-transparent [&_pre]:p-0 [&_code]:border-0 [&_code]:bg-transparent [&_code]:p-0 [&_code]:before:content-none [&_code]:after:content-none [&_p]:break-words">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeRaw]}
          >
            {announcement.content}
          </ReactMarkdown>
        </div>

        {/* Category & Tags */}
        {announcement.category_name && (
          <div className="flex gap-2">
            <Badge variant="secondary">
              {announcement.category_name}
            </Badge>
          </div>
        )}

        {/* Voting */}
        <div className="flex items-center gap-1 sm:gap-2 pt-2 border-t">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleVote('upvote')}
            disabled={voting}
            className="gap-1 px-2 sm:px-3"
          >
            {voting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ThumbsUp
                className={`h-4 w-4 ${
                  userVote === 'upvote'
                    ? 'fill-current text-primary font-bold'
                    : 'text-muted-foreground'
                }`}
              />
            )}
            <span className={userVote === 'upvote' ? 'font-semibold' : ''}>
              {announcement.upvotes_count || 0}
            </span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleVote('downvote')}
            disabled={voting}
            className="gap-1 px-2 sm:px-3"
          >
            {voting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ThumbsDown
                className={`h-4 w-4 ${
                  userVote === 'downvote'
                    ? 'fill-current text-destructive font-bold'
                    : 'text-muted-foreground'
                }`}
              />
            )}
            <span className={userVote === 'downvote' ? 'font-semibold' : ''}>
              {announcement.downvotes_count || 0}
            </span>
          </Button>

          <div className="flex-1 text-right">
            <Badge variant="outline" className={netVotes > 0 ? 'text-green-600' : netVotes < 0 ? 'text-red-600' : ''}>
              {netVotes > 0 ? '+' : ''}{netVotes}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
