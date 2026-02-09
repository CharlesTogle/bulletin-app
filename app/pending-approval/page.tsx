'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getMyGroups } from '@/actions/groups';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Clock, AlertCircle, RefreshCw, LogOut } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function PendingApprovalPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [pendingGroup, setPendingGroup] = useState<{
    id: string;
    name: string;
    code: string;
    created_at: string;
    approved: boolean;
  } | null>(null);

  async function checkGroupStatus() {
    setLoading(true);
    try {
      const result = await getMyGroups();

      if (result.success && result.data.length > 0) {
        // Find the first group the user is an admin of
        const group = result.data[0];

        // Check if approved (type might not have approved field yet, so check dynamically)
        const isApproved = (group as any).approved;

        if (isApproved) {
          // Group is approved, redirect to dashboard
          router.push(`/groups/${group.id}`);
        } else {
          // Still pending
          setPendingGroup({
            id: group.id,
            name: group.name,
            code: (group as any).code || 'N/A',
            created_at: group.created_at,
            approved: false,
          });
        }
      }
    } catch (error) {
      console.error('Failed to check group status:', error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    checkGroupStatus();
  }, []);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push('/');
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Checking group status...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background to-muted">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <div className="flex items-center gap-2 mb-2">
            <Clock className="h-6 w-6 text-amber-500" />
            <CardTitle className="text-2xl">Group Pending Approval</CardTitle>
          </div>
          <CardDescription>
            Your group is awaiting approval from a system administrator
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Pending Alert */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Approval Required</AlertTitle>
            <AlertDescription>
              All new groups require approval from a system administrator before they become active.
              You will be able to access your group and invite members once it has been approved.
            </AlertDescription>
          </Alert>

          {/* Group Details */}
          {pendingGroup && (
            <div className="space-y-3 p-4 bg-muted rounded-lg">
              <h3 className="font-semibold">Your Group Details:</h3>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Name:</span>{' '}
                  <span className="font-medium">{pendingGroup.name}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Code:</span>{' '}
                  <span className="font-mono font-medium">{pendingGroup.code}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Created:</span>{' '}
                  <span>{new Date(pendingGroup.created_at).toLocaleDateString()}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Status:</span>{' '}
                  <span className="text-amber-600 font-medium">Pending Approval</span>
                </div>
              </div>
            </div>
          )}

          {/* What Happens Next */}
          <div className="space-y-3">
            <h3 className="font-semibold">What happens next?</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">1.</span>
                <span>A system administrator will review your group request</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">2.</span>
                <span>You will be notified once your group is approved</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">3.</span>
                <span>
                  Once approved, you can start creating announcements and inviting members using your group code
                </span>
              </li>
            </ul>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              onClick={checkGroupStatus}
              variant="outline"
              className="flex-1"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Check Status
            </Button>
            <Button
              onClick={handleSignOut}
              variant="ghost"
              className="flex-1"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>

          {/* Contact Support */}
          <div className="text-center text-sm text-muted-foreground">
            <p>
              Need help? Contact your system administrator for assistance.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
