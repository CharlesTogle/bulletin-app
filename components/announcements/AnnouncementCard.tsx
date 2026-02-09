'use client';

import { useState } from 'react';
import { voteAnnouncement } from '@/actions/announcements';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ThumbsUp,
  ThumbsDown,
  Pin,
  Calendar,
  User,
  Loader2
} from 'lucide-react';

interface AnnouncementCardProps {
  announcement: any;
  userRole: 'admin' | 'contributor' | 'member' | null;
  onRefresh: () => void;
  onPin?: (announcementId: string) => Promise<void>;
}

export function AnnouncementCard({
  announcement,
  userRole,
  onRefresh,
  onPin,
}: AnnouncementCardProps) {
  const [voting, setVoting] = useState(false);
  const [pinning, setPinning] = useState(false);

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

  const userVote = announcement.user_vote;
  const netVotes = (announcement.upvotes_count || 0) - (announcement.downvotes_count || 0);

  return (
    <Card className={announcement.is_pinned ? 'border-primary' : ''}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              {announcement.is_pinned && (
                <Pin className="h-4 w-4 text-primary" />
              )}
              <h3 className="font-semibold text-lg">{announcement.title}</h3>
            </div>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <User className="h-3 w-3" />
                {announcement.author_email || 'Unknown'}
              </span>
              <span>•</span>
              <span>{new Date(announcement.created_at).toLocaleDateString()}</span>
              {announcement.deadline && (
                <>
                  <span>•</span>
                  <span className="flex items-center gap-1 text-amber-600">
                    <Calendar className="h-3 w-3" />
                    Due: {new Date(announcement.deadline).toLocaleDateString()}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Pin Button (Admin & Contributor) */}
          {userRole && ['admin', 'contributor'].includes(userRole) && onPin && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handlePin}
              disabled={pinning}
            >
              {pinning ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : announcement.is_pinned ? (
                <>
                  <Pin className="h-4 w-4 mr-1 fill-current" />
                  Unpin
                </>
              ) : (
                <>
                  <Pin className="h-4 w-4 mr-1" />
                  Pin
                </>
              )}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Image */}
        {announcement.image_url && (
          <div className="rounded-lg overflow-hidden border">
            <img
              src={announcement.image_url}
              alt={announcement.title}
              className="w-full h-auto max-h-96 object-cover"
            />
          </div>
        )}

        {/* Content */}
        <div className="prose prose-sm max-w-none">
          <p className="whitespace-pre-wrap text-sm">{announcement.content}</p>
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
        <div className="flex items-center gap-2 pt-2 border-t">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleVote('upvote')}
            disabled={voting}
            className="gap-1"
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
            className="gap-1"
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
