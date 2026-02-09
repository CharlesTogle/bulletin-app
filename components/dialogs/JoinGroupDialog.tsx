'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useServerActionWithParams } from '@/lib/hooks/useServerAction';
import { joinGroup } from '@/actions/groups';
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
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';

interface JoinGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function JoinGroupDialog({ open, onOpenChange }: JoinGroupDialogProps) {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const { isLoading, execute: executeJoin } = useServerActionWithParams(
    joinGroup,
    {
      key: 'join-group',
      onSuccess: (group) => {
        setSuccess(true);
        setError('');
        // Wait a moment to show success, then navigate
        setTimeout(() => {
          onOpenChange(false);
          setCode('');
          setSuccess(false);
          router.push(`/groups/${group.id}`);
        }, 1500);
      },
      onError: (err) => {
        setError(err);
      },
    }
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (!code.trim()) {
      setError('Group code is required');
      return;
    }

    await executeJoin(code.trim().toUpperCase());
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Join Existing Group</DialogTitle>
            <DialogDescription>
              Enter the group code provided by the group admin to join.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Group Code */}
            <div className="space-y-2">
              <Label htmlFor="code">Group Code</Label>
              <Input
                id="code"
                placeholder="e.g., ABC12345"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                disabled={isLoading || success}
                maxLength={8}
                className="font-mono tracking-wider"
              />
              <p className="text-xs text-muted-foreground">
                Group codes are 8 characters long and case-insensitive
              </p>
            </div>

            {/* Error */}
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Success */}
            {success && (
              <Alert>
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription>
                  Successfully joined the group! Redirecting...
                </AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading || success}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || success}>
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Joining...
                </>
              ) : success ? (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Joined!
                </>
              ) : (
                'Join Group'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
