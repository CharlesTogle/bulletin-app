'use client';

import { useEffect, useState } from 'react';
import { useServerAction, useServerActionWithParams } from '@/lib/hooks/useServerAction';
import {
  getPendingGroups,
  approveGroup,
  rejectGroup,
} from '@/actions/system-admin';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Check, X, Clock, RefreshCw, AlertCircle } from 'lucide-react';

interface PendingGroupsManagerProps {
  onGroupChange?: () => void;
}

/**
 * Pending Groups Manager Component
 *
 * System admin component for approving/rejecting groups
 */
export function PendingGroupsManager({ onGroupChange }: PendingGroupsManagerProps) {
  const [confirmAction, setConfirmAction] = useState<{
    groupId: string;
    action: 'approve' | 'reject';
  } | null>(null);

  // Fetch pending groups
  const {
    data: pendingGroups,
    isLoading,
    error,
    execute: fetchPending,
  } = useServerAction(getPendingGroups, {
    key: 'pending-groups',
  });

  // Approve action
  const {
    isLoading: approving,
    execute: executeApprove,
  } = useServerActionWithParams(approveGroup, {
    key: 'approve-group',
    onSuccess: () => {
      setConfirmAction(null);
      fetchPending();
      onGroupChange?.(); // Refresh parent's group list
    },
    onError: (error) => {
      alert(`Failed to approve: ${error}`);
    },
  });

  // Reject action
  const {
    isLoading: rejecting,
    execute: executeReject,
  } = useServerActionWithParams(rejectGroup, {
    key: 'reject-group',
    onSuccess: () => {
      setConfirmAction(null);
      fetchPending();
      onGroupChange?.(); // Refresh parent's group list
    },
    onError: (error) => {
      alert(`Failed to reject: ${error}`);
    },
  });

  useEffect(() => {
    fetchPending();
  }, [fetchPending]);

  async function handleApprove(groupId: string) {
    if (confirmAction?.groupId === groupId && confirmAction.action === 'approve') {
      await executeApprove(groupId);
    } else {
      setConfirmAction({ groupId, action: 'approve' });
      setTimeout(() => setConfirmAction(null), 3000);
    }
  }

  async function handleReject(groupId: string) {
    if (confirmAction?.groupId === groupId && confirmAction.action === 'reject') {
      await executeReject(groupId);
    } else {
      setConfirmAction({ groupId, action: 'reject' });
      setTimeout(() => setConfirmAction(null), 3000);
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pending Groups</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pending Groups</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="min-w-0 flex-1">
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <Clock className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
              <span className="truncate">Pending Groups</span>
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Groups awaiting approval
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => fetchPending()}
            disabled={isLoading}
            className="flex-shrink-0"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {!pendingGroups || pendingGroups.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No pending groups
          </div>
        ) : (
          <div className="space-y-3 sm:space-y-4">
            {pendingGroups.map((group) => (
              <div
                key={group.id}
                className="flex flex-col sm:flex-row sm:items-start sm:justify-between p-3 sm:p-4 border rounded-lg gap-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-2">
                    <h3 className="font-semibold text-sm sm:text-base break-words">{group.name}</h3>
                    <Badge variant="outline" className="font-mono text-xs flex-shrink-0">
                      {group.code}
                    </Badge>
                  </div>

                  {group.description && (
                    <p className="text-xs sm:text-sm text-muted-foreground mb-2 line-clamp-2">
                      {group.description}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-2 sm:gap-4 text-xs text-muted-foreground">
                    <span className="truncate max-w-[200px]">
                      Creator: {group.creator_email}
                    </span>
                    <span className="hidden sm:inline">•</span>
                    <span className="hidden sm:inline">
                      Created: {new Date(group.created_at).toLocaleDateString()}
                    </span>
                    <span className="hidden sm:inline">•</span>
                    <span>{group.admin_count} admin(s)</span>
                  </div>
                </div>

                <div className="flex gap-2 self-end sm:self-start sm:ml-4 flex-shrink-0">
                  <Button
                    size="sm"
                    variant={
                      confirmAction?.groupId === group.id &&
                      confirmAction.action === 'approve'
                        ? 'default'
                        : 'outline'
                    }
                    onClick={() => handleApprove(group.id)}
                    disabled={approving || rejecting}
                    className="text-xs sm:text-sm"
                  >
                    <Check className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-1" />
                    <span className="hidden sm:inline">
                      {confirmAction?.groupId === group.id &&
                      confirmAction.action === 'approve'
                        ? 'Confirm?'
                        : 'Approve'}
                    </span>
                  </Button>
                  <Button
                    size="sm"
                    variant={
                      confirmAction?.groupId === group.id &&
                      confirmAction.action === 'reject'
                        ? 'destructive'
                        : 'ghost'
                    }
                    onClick={() => handleReject(group.id)}
                    disabled={approving || rejecting}
                    className="text-xs sm:text-sm"
                  >
                    <X className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-1" />
                    <span className="hidden sm:inline">
                      {confirmAction?.groupId === group.id &&
                      confirmAction.action === 'reject'
                        ? 'Confirm?'
                        : 'Reject'}
                    </span>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
