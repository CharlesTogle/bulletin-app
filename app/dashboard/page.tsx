'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useServerAction } from '@/lib/hooks/useServerAction';
import { getMyGroups } from '@/actions/groups';
import { checkSystemAdminStatus } from '@/actions/system-admin';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Users, Plus, Settings, Shield, AlertCircle, Loader2 } from 'lucide-react';
import { CreateGroupDialog } from '@/components/dialogs/CreateGroupDialog';
import { JoinGroupDialog } from '@/components/dialogs/JoinGroupDialog';

export default function DashboardPage() {
  const router = useRouter();
  const supabase = createClient();
  const [userEmail, setUserEmail] = useState<string>('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);

  // Check if user is system admin
  const {
    data: adminStatus,
    execute: checkAdmin,
  } = useServerAction(checkSystemAdminStatus, {
    key: 'admin-status',
  });

  // Fetch user's groups
  const {
    data: groups,
    isLoading,
    error,
    execute: fetchGroups,
  } = useServerAction(getMyGroups, {
    key: 'my-groups',
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
    fetchGroups();
  }, [checkAdmin, fetchGroups]);

  // Redirect system admins to their dedicated dashboard
  useEffect(() => {
    if (!isLoading && adminStatus?.isSystemAdmin) {
      router.push('/system-admin/dashboard');
    }
  }, [adminStatus, isLoading, router]);

  // Debug logging
  useEffect(() => {
    console.log('Dashboard Debug:', {
      userEmail,
      adminStatus,
      groups,
      isLoading,
      error,
    });
  }, [userEmail, adminStatus, groups, isLoading, error]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push('/');
  }

  // Get user's role description
  function getRoleDescription() {
    if (adminStatus?.isSystemAdmin) {
      return 'Platform Administrator';
    }

    if (!groups || groups.length === 0) {
      return 'No groups yet';
    }

    // Count groups by role (we would need to fetch this from group_members)
    // For now, just show group count
    return `Member of ${groups.length} ${groups.length === 1 ? 'group' : 'groups'}`;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl font-bold">Dashboard</h1>
                {adminStatus?.isSystemAdmin && (
                  <Badge className="bg-primary text-primary-foreground">
                    System Admin
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                {userEmail && (
                  <>
                    <span>{userEmail}</span>
                    <span>•</span>
                  </>
                )}
                <span>{getRoleDescription()}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {adminStatus?.isSystemAdmin && (
                <Button
                  variant="outline"
                  onClick={() => router.push('/system-admin/dashboard')}
                  className="flex items-center gap-2"
                >
                  <Shield className="h-4 w-4" />
                  Admin Panel
                </Button>
              )}
              <Button variant="ghost" onClick={handleSignOut}>
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* System Admin Badge */}
          {adminStatus?.isSystemAdmin && (
            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription>
                You are a <strong>System Administrator</strong> with platform-wide privileges.
                <Button
                  variant="link"
                  className="ml-2 p-0 h-auto"
                  onClick={() => router.push('/system-admin/dashboard')}
                >
                  Go to Admin Panel →
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {/* Quick Actions */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="hover:border-primary transition-colors cursor-pointer" onClick={() => setCreateDialogOpen(true)}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  Create New Group
                </CardTitle>
                <CardDescription>
                  Start a new group and invite members
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="hover:border-primary transition-colors cursor-pointer" onClick={() => setJoinDialogOpen(true)}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Join Existing Group
                </CardTitle>
                <CardDescription>
                  Join a group using an invite code
                </CardDescription>
              </CardHeader>
            </Card>
          </div>

          {/* Groups Section */}
          <Card>
            <CardHeader>
              <CardTitle>
                {adminStatus?.isSystemAdmin ? 'All Groups' : 'My Groups'}
              </CardTitle>
              <CardDescription>
                {adminStatus?.isSystemAdmin
                  ? 'All groups in the system'
                  : "Groups you're a member of"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {!error && (!groups || groups.length === 0) ? (
                <div className="text-center py-12">
                  <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">No groups yet</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Create a new group or join an existing one to get started
                  </p>
                  <div className="flex gap-2 justify-center">
                    <Button onClick={() => setCreateDialogOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Group
                    </Button>
                    <Button variant="outline" onClick={() => setJoinDialogOpen(true)}>
                      <Users className="h-4 w-4 mr-2" />
                      Join Group
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {groups?.map((group) => (
                    <div
                      key={group.id}
                      className={`flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors ${
                        !adminStatus?.isSystemAdmin ? 'cursor-pointer' : ''
                      }`}
                      onClick={() => {
                        // System admins shouldn't navigate to groups
                        if (adminStatus?.isSystemAdmin) {
                          return;
                        }

                        // Regular users: if group is not approved, go to pending approval page
                        if (!(group as any).approved) {
                          router.push('/pending-approval');
                        } else {
                          router.push(`/groups/${group.id}`);
                        }
                      }}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold">{group.name}</h3>
                          {!(group as any).approved && (
                            <Badge variant="outline" className="text-amber-600">
                              Pending Approval
                            </Badge>
                          )}
                          {!adminStatus?.isSystemAdmin && (group as any).user_role && (
                            <Badge
                              variant="outline"
                              className={
                                (group as any).user_role === 'admin'
                                  ? 'border-primary text-primary'
                                  : (group as any).user_role === 'contributor'
                                  ? 'border-blue-600 text-blue-600'
                                  : 'border-muted-foreground text-muted-foreground'
                              }
                            >
                              {(group as any).user_role === 'admin'
                                ? 'Admin'
                                : (group as any).user_role === 'contributor'
                                ? 'Contributor'
                                : 'Member'}
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
                          {adminStatus?.isSystemAdmin && (
                            <>
                              <span>•</span>
                              <span>
                                {(group as any).announcement_count || 0} announcements
                              </span>
                            </>
                          )}
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

      {/* Dialogs */}
      <CreateGroupDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} />
      <JoinGroupDialog open={joinDialogOpen} onOpenChange={setJoinDialogOpen} />
    </div>
  );
}
