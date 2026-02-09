'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Pin, ArrowRight, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { useAuthStore } from '@/stores/authStore';
import { signIn } from '@/actions/auth';

export default function LoginPage() {
  const router = useRouter();
  const { email, password, isLoading, error, setEmail, setPassword, setIsLoading, setError, reset } = useAuthStore();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const result = await signIn(email, password);

      if (result.success) {
        reset();
        router.push('/dashboard');
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <Pin className="h-6 w-6 rotate-45" />
              <span className="text-xl font-bold">Bulletin</span>
            </Link>
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">
                Don't have an account?
              </span>
              <Button variant="outline" asChild>
                <Link href="/signup">Sign Up</Link>
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Login Section - Asymmetric Layout */}
      <section className="py-12 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
            {/* Left Column - Form */}
            <div className="flex flex-col justify-center">
              <div className="mb-8">
                <h1 className="mb-3 text-3xl font-bold tracking-tight sm:text-4xl">
                  Welcome back
                </h1>
                <p className="text-lg text-muted-foreground">
                  Sign in to access your bulletin board.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={isLoading}
                    className="h-11"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                    <Link
                      href="/forgot-password"
                      className="text-sm text-muted-foreground hover:text-foreground"
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <PasswordInput
                    id="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isLoading}
                    className="h-11"
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  size="lg"
                  disabled={isLoading}
                >
                  {isLoading ? 'Signing in...' : 'Sign In'}
                  {!isLoading && <ArrowRight className="ml-2 h-4 w-4" />}
                </Button>
              </form>

              <div className="mt-6 text-center text-sm text-muted-foreground">
                By signing in, you agree to our{' '}
                <Link href="/terms" className="hover:text-foreground underline">
                  Terms of Service
                </Link>{' '}
                and{' '}
                <Link href="/privacy" className="hover:text-foreground underline">
                  Privacy Policy
                </Link>
                .
              </div>
            </div>

            {/* Right Column - Visual */}
            <div className="hidden lg:flex lg:flex-col lg:justify-center">
              <div className="relative">
                <Card className="border-2 rotate-2">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <Pin className="h-6 w-6 rotate-45 text-primary" />
                      <div>
                        <p className="text-sm text-muted-foreground">Your team's updates</p>
                        <p className="font-semibold">All in one place</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">
                      Stop digging through email threads. Everything important is pinned where you need it.
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-2 -rotate-1 mt-6 ml-8">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <Pin className="h-6 w-6 rotate-45 text-primary" />
                      <div>
                        <p className="text-sm text-muted-foreground">Stay in sync</p>
                        <p className="font-semibold">Everyone sees the same board</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">
                      No more "did you see my message?" Every update is visible to the whole team.
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-2 rotate-1 mt-6 opacity-70">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <Pin className="h-6 w-6 rotate-45" />
                      <div>
                        <p className="text-sm text-muted-foreground">Move fast</p>
                        <p className="font-semibold">Post in seconds</p>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
