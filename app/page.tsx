import Link from 'next/link';
import {
  Pin,
  Sparkles,
  Users,
  Zap,
  ArrowRight,
  MessageSquare,
  Bell,
  Layout,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-2">
              <Pin className="h-6 w-6 rotate-45" />
              <span className="text-xl font-bold">Bulletin</span>
            </div>
            <div className="flex items-center gap-4">
              <Button variant="ghost" asChild>
                <Link href="/login">Sign In</Link>
              </Button>
              <Button asChild>
                <Link href="/signup">Get Started</Link>
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section - Asymmetric Layout */}
      <section className="relative overflow-hidden border-b">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-2 lg:gap-8">
            {/* Left Column */}
            <div className="flex flex-col justify-center">
              <Badge variant="secondary" className="mb-4 w-fit">
                <Sparkles className="mr-1 h-3 w-3" />
                Now in Beta
              </Badge>
              <h1 className="mb-6 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
                Pin what matters.
                <br />
                <span className="text-muted-foreground">
                  Share with everyone.
                </span>
              </h1>
              <p className="mb-8 text-lg text-muted-foreground">
                A bulletin board for teams that actually want to communicate.
                No fluff, no clutter—just the important stuff, pinned where
                everyone can see it.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button size="lg" asChild>
                  <Link href="/signup">
                    Start for Free
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link href="/demo">View Demo</Link>
                </Button>
              </div>
            </div>

            {/* Right Column - Visual Elements */}
            <div className="relative grid gap-4">
              {/* Stacked Cards Visual */}
              <Card className="rotate-1 border-2">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <Pin className="h-5 w-5 rotate-45 text-primary" />
                    <Badge variant="secondary">High Priority</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="font-medium">Team standup moved to 10 AM</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Don't forget the new meeting time!
                  </p>
                </CardContent>
              </Card>

              <Card className="-rotate-2 border-2">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <Pin className="h-5 w-5 rotate-45 text-primary" />
                    <Badge>Announcement</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="font-medium">New feature launch this Friday</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Join us for the celebration 🎉
                  </p>
                </CardContent>
              </Card>

              <Card className="rotate-1 border-2 opacity-60">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <Pin className="h-5 w-5 rotate-45" />
                    <Badge variant="outline">Info</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="font-medium">Office closed next Monday</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-bold">
              Everything you need. Nothing you don't.
            </h2>
            <p className="text-lg text-muted-foreground">
              Built for speed, designed for clarity.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <Zap className="mb-2 h-8 w-8 text-primary" />
                <CardTitle>Lightning Fast</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Post updates in seconds. No complex forms, no unnecessary
                  steps. Just type and pin.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Users className="mb-2 h-8 w-8 text-primary" />
                <CardTitle>Team-First</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Everyone sees the same board. No missed messages, no
                  confusion about what's important.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Bell className="mb-2 h-8 w-8 text-primary" />
                <CardTitle>Smart Notifications</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Get notified when something actually matters. We don't spam
                  you with noise.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Layout className="mb-2 h-8 w-8 text-primary" />
                <CardTitle>Organized Chaos</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Pin, categorize, and prioritize. Your board stays clean even
                  when things get busy.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <MessageSquare className="mb-2 h-8 w-8 text-primary" />
                <CardTitle>Quick Reactions</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Acknowledge updates with a single click. Show you've seen it
                  without writing a novel.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Pin className="mb-2 h-8 w-8 rotate-45 text-primary" />
                <CardTitle>Priority Pinning</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Keep critical updates at the top. Everything else flows
                  naturally below.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <Separator />

      {/* CTA Section */}
      <section className="py-20">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="mb-4 text-3xl font-bold">
            Ready to get started?
          </h2>
          <p className="mb-8 text-lg text-muted-foreground">
            Create your group bulletin board in seconds. Free to use, no credit card required.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Button size="lg" asChild>
              <Link href="/signup">
                Get Started Free
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
            {/* Brand */}
            <div className="flex items-center gap-2">
              <Pin className="h-5 w-5 rotate-45" />
              <span className="font-bold">Bulletin</span>
              <span className="text-sm text-muted-foreground">
                • Pin what matters
              </span>
            </div>

            {/* Links */}
            <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
              <Link href="/signup" className="hover:text-foreground">
                Get Started
              </Link>
              <Link href="/login" className="hover:text-foreground">
                Sign In
              </Link>
              <Link href="/privacy" className="hover:text-foreground">
                Privacy
              </Link>
              <Link href="/terms" className="hover:text-foreground">
                Terms
              </Link>
            </div>

            {/* Copyright */}
            <div className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} Bulletin
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
