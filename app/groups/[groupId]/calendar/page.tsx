'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { getGroupAnnouncements } from '@/actions/announcements';
import { getGroup } from '@/actions/groups';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, ChevronLeft, ChevronRight, Calendar as CalendarIcon, Loader2 } from 'lucide-react';

export default function GroupCalendarPage() {
  const router = useRouter();
  const params = useParams();
  const groupId = params.groupId as string;

  const [group, setGroup] = useState<any>(null);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(getWeekStart(new Date()));

  // Get the start of the week (Sunday)
  function getWeekStart(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day;
    return new Date(d.setDate(diff));
  }

  // Get array of 7 days for current week
  function getWeekDays(startDate: Date): Date[] {
    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(startDate);
      day.setDate(startDate.getDate() + i);
      days.push(day);
    }
    return days;
  }

  // Format date for display
  function formatDate(date: Date): string {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  function formatDayName(date: Date): string {
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  }

  // Check if date is today
  function isToday(date: Date): boolean {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  }

  // Get announcements for a specific day
  function getAnnouncementsForDay(date: Date): any[] {
    return announcements.filter(announcement => {
      if (!announcement.deadline) return false;
      const deadlineDate = new Date(announcement.deadline);
      return deadlineDate.toDateString() === date.toDateString();
    });
  }

  // Navigate to previous week
  function previousWeek() {
    const newStart = new Date(currentWeekStart);
    newStart.setDate(newStart.getDate() - 7);
    setCurrentWeekStart(newStart);
  }

  // Navigate to next week
  function nextWeek() {
    const newStart = new Date(currentWeekStart);
    newStart.setDate(newStart.getDate() + 7);
    setCurrentWeekStart(newStart);
  }

  // Reset to current week
  function goToCurrentWeek() {
    setCurrentWeekStart(getWeekStart(new Date()));
  }

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [groupResult, announcementsResult] = await Promise.all([
        getGroup(groupId),
        getGroupAnnouncements(groupId, {
          pageSize: 1000, // Fetch all for calendar view
        }),
      ]);

      if (groupResult.success) {
        setGroup(groupResult.data);
      }

      if (announcementsResult.success) {
        // Filter to only announcements with deadlines
        const allAnnouncements = announcementsResult.data?.data || [];
        const withDeadlines = allAnnouncements.filter(a => a.deadline);
        setAnnouncements(withDeadlines);
      }
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const weekDays = getWeekDays(currentWeekStart);
  const weekEnd = new Date(currentWeekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Loading calendar...</p>
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
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push(`/groups/${groupId}`)}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Group
              </Button>
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                  <CalendarIcon className="h-6 w-6" />
                  {group?.name} - Calendar
                </h1>
                <p className="text-sm text-muted-foreground">
                  Announcements with deadlines
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Calendar Controls */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>
                  {formatDate(currentWeekStart)} - {formatDate(weekEnd)}
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={goToCurrentWeek}
                  >
                    Today
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={previousWeek}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={nextWeek}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Calendar Week View */}
              <div className="grid grid-cols-7 gap-2">
                {weekDays.map((day, index) => {
                  const dayAnnouncements = getAnnouncementsForDay(day);
                  const today = isToday(day);

                  return (
                    <div
                      key={index}
                      className={`border rounded-lg p-3 min-h-[200px] ${
                        today ? 'bg-primary/5 border-primary' : 'bg-card'
                      }`}
                    >
                      {/* Day Header */}
                      <div className="mb-2 pb-2 border-b">
                        <div className="font-semibold text-sm">
                          {formatDayName(day)}
                        </div>
                        <div className={`text-lg font-bold ${today ? 'text-primary' : ''}`}>
                          {day.getDate()}
                        </div>
                        {today && (
                          <Badge variant="default" className="text-xs mt-1">
                            Today
                          </Badge>
                        )}
                      </div>

                      {/* Announcements for this day */}
                      <div className="space-y-2">
                        {dayAnnouncements.length === 0 ? (
                          <p className="text-xs text-muted-foreground">No deadlines</p>
                        ) : (
                          dayAnnouncements.map((announcement) => (
                            <div
                              key={announcement.id}
                              className="p-2 bg-background rounded border hover:border-primary transition-colors cursor-pointer"
                              onClick={() => router.push(`/groups/${groupId}`)}
                            >
                              <p className="text-xs font-semibold line-clamp-2">
                                {announcement.title}
                              </p>
                              {announcement.is_pinned && (
                                <Badge variant="outline" className="text-xs mt-1">
                                  Pinned
                                </Badge>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Legend */}
          <Card>
            <CardContent className="py-4">
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border border-primary bg-primary/5 rounded"></div>
                  <span>Today</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border rounded"></div>
                  <span>Other days</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
