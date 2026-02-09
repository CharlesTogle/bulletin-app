'use client';

import { useEffect, useState } from 'react';
import { useServerAction } from '@/lib/hooks/useServerAction';
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

/**
 * Pending Groups Manager Component
 *
 * System admin component for approving/rejecting groups
 */
export function PendingGroupsManager() {
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
  } = useServerAction(approveGroup, {
    key: 'approve-group',
    onSuccess: () => {
      setConfirmAction(null);
      fetchPending();
    },
    onError: (error) => {
      alert(`Failed to approve: ${error}`);
    },
  });

  // Reject action
  const {
    isLoading: rejecting,
    execute: executeReject,
  } = useServerAction(rejectGroup, {
    key: 'reject-group',
    onSuccess: () => {
      setConfirmAction(null);
      fetchPending();
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
          <div>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Pending Groups
            </CardTitle>
            <CardDescription>
              Groups awaiting approval
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => fetchPending()}
            disabled={isLoading}
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
          <div className="space-y-4">
            {pendingGroups.map((group) => (
              <div
                key={group.id}
                className="flex items-start justify-between p-4 border rounded-lg"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold">{group.name}</h3>
                    <Badge variant="outline" className="font-mono">
                      {group.code}
                    </Badge>
                  </div>

                  {group.description && (
                    <p className="text-sm text-muted-foreground mb-2">
                      {group.description}
                    </p>
                  )}

                  <div className="flex gap-4 text-xs text-muted-foreground">
                    <span>Creator: {group.creator_email}</span>
                    <span>•</span>
                    <span>
                      Created: {new Date(group.created_at).toLocaleDateString()}
                    </span>
                    <span>•</span>
                    <span>{group.admin_count} admin(s)</span>
                  </div>
                </div>

                <div className="flex gap-2 ml-4">
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
                  >
                    <Check className="h-4 w-4 mr-1" />
                    {confirmAction?.groupId === group.id &&
                    confirmAction.action === 'approve'
                      ? 'Confirm?'
                      : 'Approve'}
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
                  >
                    <X className="h-4 w-4 mr-1" />
                    {confirmAction?.groupId === group.id &&
                    confirmAction.action === 'reject'
                      ? 'Confirm?'
                      : 'Reject'}
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
