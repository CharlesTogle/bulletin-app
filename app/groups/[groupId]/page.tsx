'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { getGroup, getGroupMembers, updateMemberRole } from '@/actions/groups';
import { getGroupAnnouncements, getPinnedAnnouncements, togglePinAnnouncement } from '@/actions/announcements';
import { getUserGroupRole } from '@/lib/auth/permissions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Pagination } from '@/components/ui/pagination';
import {
  ArrowLeft,
  Users,
  Copy,
  Settings,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Clock,
  Plus,
  ThumbsUp,
  ThumbsDown,
  Pin,
  MessageSquare,
  ChevronDown,
  Pencil,
  User,
  Calendar,
  Tag
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { AnnouncementCard } from '@/components/announcements/AnnouncementCard';
import { CreateAnnouncementDialog } from '@/components/announcements/CreateAnnouncementDialog';
import { AnnouncementFilters, AnnouncementFilterState } from '@/components/announcements/AnnouncementFilters';
import { TagManagementDialog } from '@/components/tags/TagManagementDialog';

export default function GroupPage() {
  const router = useRouter();
  const params = useParams();
  const groupId = params.groupId as string;
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [group, setGroup] = useState<any>(null);
  const [error, setError] = useState<string>('');
  const [copied, setCopied] = useState(false);
  // Announcements state
  const [pinnedAnnouncements, setPinnedAnnouncements] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [announcementsLoading, setAnnouncementsLoading] = useState(false);
  const [announcementPage, setAnnouncementPage] = useState(1);
  const [announcementTotal, setAnnouncementTotal] = useState(0);
  const [announcementTotalPages, setAnnouncementTotalPages] = useState(0);
  const [announcementFilters, setAnnouncementFilters] = useState<AnnouncementFilterState>({
    sortBy: 'created_at',
    sortOrder: 'desc',
  });

  // Members state
  const [members, setMembers] = useState<any[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [memberPage, setMemberPage] = useState(1);
  const [memberTotal, setMemberTotal] = useState(0);
  const [memberTotalPages, setMemberTotalPages] = useState(0);
  const [memberSort, setMemberSort] = useState<'joined_at' | 'email' | 'role'>('joined_at');
  const [memberSortOrder, setMemberSortOrder] = useState<'asc' | 'desc'>('asc');
  const [updatingMemberId, setUpdatingMemberId] = useState<string | null>(null);

  // Other state
  const [userRole, setUserRole] = useState<'admin' | 'contributor' | 'member' | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [tagManagementDialogOpen, setTagManagementDialogOpen] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Get current user ID
  useEffect(() => {
    async function fetchCurrentUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
      }
    }
    fetchCurrentUser();
  }, [supabase]);

  const fetchAnnouncements = useCallback(async () => {
    if (!group?.approved) return;

    setAnnouncementsLoading(true);
    try {
      // Fetch pinned announcements separately (always visible)
      const pinnedResult = await getPinnedAnnouncements(groupId);
      if (pinnedResult.success) {
        setPinnedAnnouncements(pinnedResult.data || []);
      }

      // Fetch paginated announcements
      const result = await getGroupAnnouncements(groupId, {
        page: announcementPage,
        pageSize: 10,
        sortBy: announcementFilters.sortBy,
        sortOrder: announcementFilters.sortOrder,
        tagId: announcementFilters.tagId,
      });

      if (result.success) {
        setAnnouncements(result.data.data || []);
        setAnnouncementTotal(result.data.total);
        setAnnouncementTotalPages(result.data.totalPages);
      }
    } catch (err) {
      console.error('Failed to fetch announcements:', err);
    } finally {
      setAnnouncementsLoading(false);
    }
  }, [groupId, group?.approved, announcementPage, announcementFilters]);

  const fetchUserRole = useCallback(async () => {
    if (!group?.approved) return;

    try {
      const result = await getUserGroupRole(groupId);
      // getUserGroupRole returns { role, isMember } directly
      if (result.isMember) {
        setUserRole(result.role);
      }
    } catch (err) {
      console.error('Failed to fetch user role:', err);
    }
  }, [groupId, group?.approved]);

  const fetchMembers = useCallback(async () => {
    if (!group?.approved) return;

    setMembersLoading(true);
    try {
      const result = await getGroupMembers(groupId, {
        page: memberPage,
        pageSize: 20,
        sortBy: memberSort,
        sortOrder: memberSortOrder,
      });

      if (result.success) {
        setMembers(result.data.data || []);
        setMemberTotal(result.data.total);
        setMemberTotalPages(result.data.totalPages);
      } else {
        console.error('Failed to fetch members:', result.error);
      }
    } catch (err) {
      console.error('Failed to fetch members:', err);
    } finally {
      setMembersLoading(false);
    }
  }, [groupId, group?.approved, memberPage, memberSort, memberSortOrder]);

  useEffect(() => {
    async function fetchGroup() {
      setLoading(true);
      try {
        const result = await getGroup(groupId);

        if (!result.success) {
          setError(result.error || 'Failed to load group');
          return;
        }

        setGroup(result.data);
      } catch (err) {
        console.error('Failed to fetch group:', err);
        setError('Failed to load group');
      } finally {
        setLoading(false);
      }
    }

    fetchGroup();
  }, [groupId]);

  useEffect(() => {
    if (group?.approved) {
      fetchAnnouncements();
      fetchUserRole();
      fetchMembers();
    }
  }, [group?.approved, fetchAnnouncements, fetchUserRole, fetchMembers]);

  async function handleRoleChange(memberId: string, newRole: 'contributor' | 'member') {
    setUpdatingMemberId(memberId);
    try {
      const result = await updateMemberRole(groupId, memberId, newRole);
      if (result.success) {
        fetchMembers(); // Refresh members list
      } else {
        alert(result.error || 'Failed to update role');
      }
    } catch (err) {
      console.error('Failed to update role:', err);
      alert('Failed to update role');
    } finally {
      setUpdatingMemberId(null);
    }
  }

  async function handlePinAnnouncement(announcementId: string) {
    try {
      const result = await togglePinAnnouncement(announcementId);
      if (!result.success) {
        alert(result.error || 'Failed to pin/unpin announcement');
      }
    } catch (err) {
      console.error('Failed to pin/unpin announcement:', err);
      alert('Failed to pin/unpin announcement');
    }
  }

  async function handleCopyCode() {
    if (group?.code) {
      await navigator.clipboard.writeText(group.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push('/');
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Loading group...</p>
        </div>
      </div>
    );
  }

  if (error || !group) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Error
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              {error || 'Group not found'}
            </p>
            <Button onClick={() => router.push('/dashboard')} className="w-full">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // If group is not approved, show pending status
  if (!group.approved) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background to-muted">
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-6 w-6 text-amber-500" />
              <CardTitle className="text-2xl">Group Pending Approval</CardTitle>
            </div>
            <CardDescription>
              This group is awaiting approval from a system administrator
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Approval Required</AlertTitle>
              <AlertDescription>
                All new groups require approval from a system administrator before they become active.
                You will be able to access your group and invite members once it has been approved.
              </AlertDescription>
            </Alert>

            <div className="space-y-3 p-4 bg-muted rounded-lg">
              <h3 className="font-semibold">Group Details:</h3>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Name:</span>{' '}
                  <span className="font-medium">{group.name}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Code:</span>{' '}
                  <span className="font-mono font-medium">{group.code}</span>
                </div>
                {group.description && (
                  <div>
                    <span className="text-muted-foreground">Description:</span>{' '}
                    <span>{group.description}</span>
                  </div>
                )}
                <div>
                  <span className="text-muted-foreground">Created:</span>{' '}
                  <span>{new Date(group.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={() => router.push('/dashboard')}
                variant="outline"
                className="flex-1"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
              <Button
                onClick={handleSignOut}
                variant="ghost"
                className="flex-1"
              >
                Sign Out
              </Button>
            </div>
          </CardContent>
        </Card>
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
                Back
              </Button>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="text-2xl font-bold">{group.name}</h1>
                  <Badge className="bg-green-600 text-white">
                    Approved
                  </Badge>
                  {userRole && (
                    <Badge
                      variant="outline"
                      className={
                        userRole === 'admin'
                          ? 'border-primary text-primary'
                          : userRole === 'contributor'
                          ? 'border-blue-600 text-blue-600'
                          : 'border-muted-foreground text-muted-foreground'
                      }
                    >
                      {userRole === 'admin' ? 'Admin' : userRole === 'contributor' ? 'Contributor' : 'Member'}
                    </Badge>
                  )}
                </div>
                {group.description && (
                  <p className="text-sm text-muted-foreground">
                    {group.description}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push(`/groups/${groupId}/calendar`)}
              >
                <Calendar className="h-4 w-4 mr-2" />
                Calendar
              </Button>
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
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
          {/* Group Info Card */}
          <Card>
            <CardHeader>
              <CardTitle>Group Information</CardTitle>
              <CardDescription>
                Share the group code with others to invite them
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <label className="text-sm font-medium text-muted-foreground">
                    Group Code
                  </label>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="text-2xl font-mono font-bold tracking-wider">
                      {group.code}
                    </code>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCopyCode}
                    >
                      {copied ? (
                        <>
                          <CheckCircle2 className="h-4 w-4 mr-1 text-green-600" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4 mr-1" />
                          Copy
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <p className="text-sm text-muted-foreground">Created</p>
                  <p className="font-medium">
                    {new Date(group.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Last Updated</p>
                  <p className="font-medium">
                    {new Date(group.updated_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Members Section - Admin Only */}
          {userRole === 'admin' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Members
                </CardTitle>
                <CardDescription>
                  Manage member roles and permissions
                </CardDescription>
              </CardHeader>
              <CardContent>
                {membersLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : members.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-4 opacity-20" />
                    <p>No members yet</p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      {members.map((member) => (
                        <div
                          key={member.id}
                          className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="flex items-center justify-center h-10 w-10 rounded-full bg-primary/10 flex-shrink-0">
                              <User className="h-5 w-5 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{member.email}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge
                                  variant="outline"
                                  className={
                                    member.role === 'admin'
                                      ? 'border-primary text-primary'
                                      : member.role === 'contributor'
                                      ? 'border-blue-600 text-blue-600'
                                      : 'border-muted-foreground text-muted-foreground'
                                  }
                                >
                                  {member.role === 'admin'
                                    ? 'Admin'
                                    : member.role === 'contributor'
                                    ? 'Contributor'
                                    : 'Member'}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  Joined {new Date(member.joined_at).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {updatingMemberId === member.id ? (
                              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                            ) : member.user_id === currentUserId ? (
                              <span className="text-xs text-muted-foreground px-3">You</span>
                            ) : (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <Settings className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    onClick={() => handleRoleChange(member.id, 'contributor')}
                                    disabled={member.role === 'contributor'}
                                  >
                                    <Pencil className="h-4 w-4 mr-2" />
                                    Make Contributor
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => handleRoleChange(member.id, 'member')}
                                    disabled={member.role === 'member'}
                                  >
                                    <User className="h-4 w-4 mr-2" />
                                    Make Member
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Members Pagination */}
                    <Pagination
                      currentPage={memberPage}
                      totalPages={memberTotalPages}
                      onPageChange={setMemberPage}
                      total={memberTotal}
                    />
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* Pinned Announcements */}
          {pinnedAnnouncements.length > 0 && (
            <Card className="border-primary/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Pin className="h-5 w-5 text-primary fill-current" />
                  Pinned Announcements
                </CardTitle>
                <CardDescription>
                  Important announcements that stay at the top
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {pinnedAnnouncements.map((announcement) => (
                    <AnnouncementCard
                      key={announcement.id}
                      announcement={announcement}
                      userRole={userRole}
                      onRefresh={fetchAnnouncements}
                      onPin={userRole && ['admin', 'contributor'].includes(userRole) ? handlePinAnnouncement : undefined}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Announcements Section */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    All Announcements
                  </CardTitle>
                  <CardDescription>
                    {userRole === 'member'
                      ? 'View and vote on announcements'
                      : 'Create and manage announcements'}
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  {userRole === 'admin' && (
                    <Button
                      variant="outline"
                      onClick={() => setTagManagementDialogOpen(true)}
                    >
                      <Tag className="h-4 w-4 mr-2" />
                      Manage Tags
                    </Button>
                  )}
                  {userRole && ['admin', 'contributor'].includes(userRole) && (
                    <Button onClick={() => setCreateDialogOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      New Announcement
                    </Button>
                  )}
                </div>
              </div>

              {/* Filters */}
              <AnnouncementFilters
                groupId={groupId}
                filters={announcementFilters}
                onFiltersChange={(newFilters) => {
                  setAnnouncementFilters(newFilters);
                  setAnnouncementPage(1); // Reset to page 1 when filters change
                }}
              />
            </CardHeader>
            <CardContent>
              {announcementsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : announcements.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  <p className="mb-2">No announcements yet</p>
                  {userRole && ['admin', 'contributor'].includes(userRole) ? (
                    <p className="text-sm">Create the first announcement to get started</p>
                  ) : (
                    <p className="text-sm">Announcements from admins and contributors will appear here</p>
                  )}
                </div>
              ) : (
                <>
                  <div className="space-y-4">
                    {announcements.map((announcement) => (
                      <AnnouncementCard
                        key={announcement.id}
                        announcement={announcement}
                        userRole={userRole}
                        onRefresh={fetchAnnouncements}
                        onPin={userRole && ['admin', 'contributor'].includes(userRole) ? handlePinAnnouncement : undefined}
                      />
                    ))}
                  </div>

                  {/* Pagination */}
                  <Pagination
                    currentPage={announcementPage}
                    totalPages={announcementTotalPages}
                    onPageChange={setAnnouncementPage}
                    total={announcementTotal}
                  />
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Create Announcement Dialog */}
      <CreateAnnouncementDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        groupId={groupId}
        onSuccess={fetchAnnouncements}
      />

      {/* Tag Management Dialog */}
      <TagManagementDialog
        open={tagManagementDialogOpen}
        onOpenChange={setTagManagementDialogOpen}
        groupId={groupId}
      />
    </div>
  );
}
