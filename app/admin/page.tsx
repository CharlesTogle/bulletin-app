'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useServerAction } from '@/lib/hooks/useServerAction';
import { checkSystemAdminStatus } from '@/actions/system-admin';
import { SystemAdminDashboard } from '@/components/admin/SystemAdminDashboard';
import { PendingGroupsManager } from '@/components/admin/PendingGroupsManager';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, ArrowLeft, Loader2, AlertCircle } from 'lucide-react';

export default function AdminPage() {
  const router = useRouter();
  const supabase = createClient();
  const [userEmail, setUserEmail] = React.useState<string>('');

  // Check if user is system admin
  const {
    data: adminStatus,
    isLoading,
    error,
    execute: checkAdmin,
  } = useServerAction(checkSystemAdminStatus, {
    key: 'admin-status-check',
  });

  // Get user email
  useEffect(() => {
    async function getUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        setUserEmail(user.email);
      }
    }
    getUser();
  }, [supabase]);

  useEffect(() => {
    checkAdmin();
  }, [checkAdmin]);

  // Redirect to new system admin dashboard
  useEffect(() => {
    if (!isLoading && adminStatus?.isSystemAdmin) {
      router.push('/system-admin/dashboard');
    } else if (!isLoading && adminStatus && !adminStatus.isSystemAdmin) {
      router.push('/dashboard');
    }
  }, [adminStatus, isLoading, router]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push('/');
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Checking permissions...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!adminStatus?.isSystemAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You do not have permission to access this page.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/dashboard')}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
              <div className="flex items-center gap-2">
                <Shield className="h-6 w-6 text-primary" />
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h1 className="text-2xl font-bold">System Admin</h1>
                    <Badge className="bg-primary text-primary-foreground">
                      Administrator
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {userEmail && <><span>{userEmail}</span> <span>•</span> </>}
                    Platform management and statistics
                  </p>
                </div>
              </div>
            </div>
            <Button variant="ghost" onClick={handleSignOut}>
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Pending Groups Manager */}
          <PendingGroupsManager />

          {/* Statistics Dashboard */}
          <SystemAdminDashboard />
        </div>
      </main>
    </div>
  );
}
