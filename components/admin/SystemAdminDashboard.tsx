'use client';

import { useEffect, useCallback } from 'react';
import { useServerAction } from '@/lib/hooks/useServerAction';
import {
  getSystemStatistics,
  getTopActiveGroups,
  getGroupsTimeline,
  getAnnouncementsTimeline,
} from '@/actions/system-admin';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Users,
  MessageSquare,
  FolderOpen,
  ThumbsUp,
  Paperclip,
  TrendingUp,
} from 'lucide-react';

/**
 * System Admin Dashboard Component
 *
 * Displays system-wide statistics and analytics
 * Requires user to have system_admin role
 */
export function SystemAdminDashboard() {
  // Memoize timeline action wrappers to prevent infinite loops
  const getGroupsTimelineAction = useCallback(() => getGroupsTimeline(30), []);
  const getAnnouncementsTimelineAction = useCallback(() => getAnnouncementsTimeline(30), []);

  // Fetch statistics
  const {
    data: stats,
    isLoading: statsLoading,
    execute: fetchStats,
  } = useServerAction(getSystemStatistics, {
    key: 'system-stats',
  });

  // Fetch top active groups
  const {
    data: topGroups,
    isLoading: groupsLoading,
    execute: fetchTopGroups,
  } = useServerAction(getTopActiveGroups, {
    key: 'top-groups',
  });

  // Fetch timeline data
  const {
    data: groupsTimeline,
    execute: fetchGroupsTimeline,
  } = useServerAction(getGroupsTimelineAction, {
    key: 'groups-timeline',
  });

  const {
    data: announcementsTimeline,
    execute: fetchAnnouncementsTimeline,
  } = useServerAction(getAnnouncementsTimelineAction, {
    key: 'announcements-timeline',
  });

  useEffect(() => {
    fetchStats();
    fetchTopGroups();
    fetchGroupsTimeline();
    fetchAnnouncementsTimeline();
  }, [fetchStats, fetchTopGroups, fetchGroupsTimeline, fetchAnnouncementsTimeline]);

  if (statsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-muted-foreground">Loading statistics...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">Statistics</h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Platform-wide statistics and analytics
        </p>
      </div>

      {/* Statistics Overview */}
      <div className="grid gap-3 sm:gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-3">
        <StatCard
          title="Total Groups"
          value={stats?.total_groups || 0}
          icon={<FolderOpen className="h-4 w-4" />}
        />
        <StatCard
          title="Total Announcements"
          value={stats?.total_announcements || 0}
          icon={<MessageSquare className="h-4 w-4" />}
        />
        <StatCard
          title="Active Users"
          value={stats?.total_active_users || 0}
          icon={<Users className="h-4 w-4" />}
        />
        <StatCard
          title="Total Memberships"
          value={stats?.total_memberships || 0}
          icon={<Users className="h-4 w-4" />}
        />
        <StatCard
          title="Total Votes"
          value={stats?.total_votes || 0}
          icon={<ThumbsUp className="h-4 w-4" />}
        />
        <StatCard
          title="Total Attachments"
          value={stats?.total_attachments || 0}
          icon={<Paperclip className="h-4 w-4" />}
        />
      </div>

      {/* Top Active Groups */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5" />
            Top Active Groups
          </CardTitle>
        </CardHeader>
        <CardContent>
          {groupsLoading ? (
            <div className="text-sm text-muted-foreground">Loading...</div>
          ) : topGroups && topGroups.length > 0 ? (
            <div className="space-y-3 sm:space-y-4">
              {topGroups.slice(0, 10).map((group) => (
                <div
                  key={group.id}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 py-2 border-b last:border-0"
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-sm sm:text-base truncate">{group.name}</div>
                    <div className="text-xs sm:text-sm text-muted-foreground">
                      Code: {group.code}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5 sm:gap-2 text-xs sm:text-sm">
                    <Badge variant="outline" className="text-xs">
                      {group.member_count} members
                    </Badge>
                    <Badge variant="outline" className="text-xs hidden sm:inline-flex">
                      {group.announcement_count} announcements
                    </Badge>
                    <Badge variant="outline" className="text-xs sm:hidden">
                      {group.announcement_count} posts
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {group.vote_count} votes
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">
              No active groups yet
            </div>
          )}
        </CardContent>
      </Card>

      {/* Timeline Charts - Placeholder for actual chart implementation */}
      <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Groups Created (Last 30 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">
              {groupsTimeline?.length || 0} days with activity
            </div>
            {/* TODO: Add chart library (e.g., recharts) for visualization */}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Announcements Created (Last 30 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">
              {announcementsTimeline?.length || 0} days with activity
            </div>
            {/* TODO: Add chart library (e.g., recharts) for visualization */}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
}

function StatCard({ title, value, icon }: StatCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-6">
        <CardTitle className="text-xs sm:text-sm font-medium">{title}</CardTitle>
        <div className="text-muted-foreground">{icon}</div>
      </CardHeader>
      <CardContent className="p-3 sm:p-6 pt-0 sm:pt-0">
        <div className="text-xl sm:text-2xl font-bold">{value.toLocaleString()}</div>
      </CardContent>
    </Card>
  );
}
