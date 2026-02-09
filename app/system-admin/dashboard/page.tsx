'use client';

import React, { useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useServerAction } from '@/lib/hooks/useServerAction';
import { checkSystemAdminStatus } from '@/actions/system-admin';
import { getMyGroups } from '@/actions/groups';
import { SystemAdminDashboard } from '@/components/admin/SystemAdminDashboard';
import { PendingGroupsManager } from '@/components/admin/PendingGroupsManager';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Shield, ArrowLeft, Users, Settings, Loader2 } from 'lucide-react';

export default function SystemAdminDashboardPage() {
  const router = useRouter();
  const supabase = createClient();
  const [userEmail, setUserEmail] = React.useState<string>('');
  const [isReady, setIsReady] = React.useState(false);

  // Check if user is system admin
  const {
    data: adminStatus,
    isLoading: adminLoading,
    execute: checkAdmin,
  } = useServerAction(checkSystemAdminStatus, {
    key: 'admin-status-check',
  });

  // Fetch all groups - only after admin check passes
  const {
    data: groups,
    isLoading: groupsLoading,
    error: groupsError,
    execute: fetchGroups,
  } = useServerAction(getMyGroups, {
    key: 'all-groups-admin',
  });

  // Get user email - use useCallback for async operations that modify state
  const getUser = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.email) {
      setUserEmail(user.email);
    }
  }, [supabase]);

  useEffect(() => {
    getUser();
  }, [getUser]);

  useEffect(() => {
    checkAdmin();
  }, [checkAdmin]);

  // Only fetch groups and mark ready after admin check completes
  useEffect(() => {
    if (!adminLoading && adminStatus?.isSystemAdmin) {
      fetchGroups();
      setIsReady(true);
    }
  }, [adminLoading, adminStatus, fetchGroups]);

  // Redirect if not admin
  useEffect(() => {
    if (!adminLoading && adminStatus && !adminStatus.isSystemAdmin) {
      router.push('/dashboard');
    }
  }, [adminStatus, adminLoading, router]);

  const handleSignOut = useCallback(async () => {
    await supabase.auth.signOut();
    router.push('/');
  }, [supabase, router]);

  if (adminLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Checking permissions...</p>
        </div>
      </div>
    );
  }

  if (!adminStatus?.isSystemAdmin) {
    return null; // Will redirect
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
                Back
              </Button>
              <div className="flex items-center gap-2">
                <Shield className="h-6 w-6 text-primary" />
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h1 className="text-2xl font-bold">System Admin Dashboard</h1>
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
          {/* Statistics Dashboard - lazy load after admin check */}
          {isReady && <SystemAdminDashboard />}

          {/* Pending Groups Manager - lazy load after admin check */}
          {isReady && <PendingGroupsManager onGroupChange={fetchGroups} />}

          {/* All Groups */}
          <Card>
            <CardHeader>
              <CardTitle>All Groups</CardTitle>
              <CardDescription>
                All groups in the system
              </CardDescription>
            </CardHeader>
            <CardContent>
              {groupsLoading && (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              )}

              {groupsError && (
                <div className="text-center py-8 text-destructive">
                  Error: {groupsError}
                </div>
              )}

              {!groupsLoading && !groupsError && (!groups || groups.length === 0) && (
                <div className="text-center py-12">
                  <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">No groups yet</h3>
                  <p className="text-sm text-muted-foreground">
                    Groups will appear here once users create them
                  </p>
                </div>
              )}

              {!groupsLoading && !groupsError && groups && groups.length > 0 && (
                <div className="space-y-4">
                  {groups.map((group) => (
                    <div
                      key={group.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => router.push(`/groups/${group.id}`)}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold">{group.name}</h3>
                          {!(group as any).approved && (
                            <Badge variant="outline" className="text-amber-600">
                              Pending Approval
                            </Badge>
                          )}
                          {(group as any).approved && (
                            <Badge variant="outline" className="text-green-600">
                              Approved
                            </Badge>
                          )}
                        </div>
                        {group.description && (
                          <p className="text-sm text-muted-foreground mb-2">
                            {group.description}
                          </p>
                        )}
                        <div className="flex gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {group.member_count} members
                          </span>
                          <span>•</span>
                          <span>
                            {(group as any).announcement_count || 0} announcements
                          </span>
                          <span>•</span>
                          <span>
                            Created {new Date(group.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      <Button variant="ghost" size="sm">
                        <Settings className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
