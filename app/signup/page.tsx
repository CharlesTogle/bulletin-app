'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { createGroup, joinGroup } from '@/actions/groups';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Users, UserPlus, Loader2 } from 'lucide-react';

export default function SignUpPage() {
  const router = useRouter();
  const supabase = createClient();

  // Auth state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');

  // Create group state
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [groupLoading, setGroupLoading] = useState(false);
  const [groupError, setGroupError] = useState('');
  const [groupSuccess, setGroupSuccess] = useState('');

  // Confirmation state
  const [needsConfirmation, setNeedsConfirmation] = useState(false);

  // Join group state
  const [groupCode, setGroupCode] = useState('');
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinError, setJoinError] = useState('');
  const [joinSuccess, setJoinSuccess] = useState('');

  // Handle sign up and create group
  async function handleCreateGroup(e: React.FormEvent) {
    e.preventDefault();
    setAuthError('');
    setGroupError('');
    setGroupSuccess('');

    // Validate
    if (password !== confirmPassword) {
      setAuthError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setAuthError('Password must be at least 6 characters');
      return;
    }

    if (!groupName.trim()) {
      setGroupError('Group name is required');
      return;
    }

    setAuthLoading(true);
    setGroupLoading(true);

    try {
      // 1. Sign up the user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) {
        setAuthError(authError.message);
        return;
      }

      if (!authData.user) {
        setAuthError('Failed to create account');
        return;
      }

      // Check if email confirmation is required
      if (!authData.session) {
        // User needs to confirm their email first
        setNeedsConfirmation(true);
        setGroupSuccess(
          `Account created! We've sent a confirmation email to ${email}. ` +
          'Please check your inbox and click the confirmation link to complete your registration.'
        );
        return;
      }

      // IMPORTANT: Wait for session to be established in cookies
      // The client has the session but server needs cookies to be set
      await new Promise(resolve => setTimeout(resolve, 500));

      // Verify session is accessible
      const { data: { session: verifySession } } = await supabase.auth.getSession();
      if (!verifySession) {
        setAuthError('Session not established. Please sign in.');
        return;
      }

      // 2. Create the group (only if email is confirmed)
      const result = await createGroup({
        name: groupName.trim(),
        description: groupDescription.trim() || undefined,
      });

      if (!result.success) {
        setGroupError(result.error);
        return;
      }

      // 3. Success - show pending message
      setGroupSuccess(
        `Group "${groupName}" created successfully with code: ${result.data.code}. ` +
        'Your group is pending approval by a system administrator. You will be notified once approved.'
      );

      // Redirect to pending page after 3 seconds
      setTimeout(() => {
        router.push('/pending-approval');
      }, 3000);
    } catch (error) {
      console.error('Sign up error:', error);
      setAuthError('An unexpected error occurred');
    } finally {
      setAuthLoading(false);
      setGroupLoading(false);
    }
  }

  // Handle sign up and join group
  async function handleJoinGroup(e: React.FormEvent) {
    e.preventDefault();
    setAuthError('');
    setJoinError('');
    setJoinSuccess('');

    // Validate
    if (password !== confirmPassword) {
      setAuthError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setAuthError('Password must be at least 6 characters');
      return;
    }

    if (!groupCode.trim()) {
      setJoinError('Group code is required');
      return;
    }

    setAuthLoading(true);
    setJoinLoading(true);

    try {
      // 1. Sign up the user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) {
        setAuthError(authError.message);
        return;
      }

      if (!authData.user) {
        setAuthError('Failed to create account');
        return;
      }

      // Check if email confirmation is required
      if (!authData.session) {
        // User needs to confirm their email first
        setNeedsConfirmation(true);
        setJoinSuccess(
          `Account created! We've sent a confirmation email to ${email}. ` +
          'Please check your inbox and click the confirmation link, then come back and sign in to join the group.'
        );
        return;
      }

      // IMPORTANT: Wait for session to be established in cookies
      await new Promise(resolve => setTimeout(resolve, 500));

      // Verify session is accessible
      const { data: { session: verifySession } } = await supabase.auth.getSession();
      if (!verifySession) {
        setAuthError('Session not established. Please sign in.');
        return;
      }

      // 2. Join the group (only if email is confirmed)
      const result = await joinGroup(groupCode.trim().toUpperCase());

      if (!result.success) {
        setJoinError(result.error);
        return;
      }

      // 3. Success - redirect to group
      router.push(`/groups/${result.data.id}`);
    } catch (error) {
      console.error('Sign up error:', error);
      setAuthError('An unexpected error occurred');
    } finally {
      setAuthLoading(false);
      setJoinLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background to-muted">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="text-2xl">Sign Up</CardTitle>
          <CardDescription>
            Create an account and either start a new group or join an existing one
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="create" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="create" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Create Group
              </TabsTrigger>
              <TabsTrigger value="join" className="flex items-center gap-2">
                <UserPlus className="h-4 w-4" />
                Join Group
              </TabsTrigger>
            </TabsList>

            {/* Create Group Tab */}
            <TabsContent value="create" className="space-y-4 mt-4">
              <form onSubmit={handleCreateGroup} className="space-y-4">
                {/* Email */}
                <div>
                  <Label htmlFor="create-email">Email</Label>
                  <Input
                    id="create-email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={authLoading}
                  />
                </div>

                {/* Password */}
                <div>
                  <Label htmlFor="create-password">Password</Label>
                  <PasswordInput
                    id="create-password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    disabled={authLoading}
                  />
                </div>

                {/* Confirm Password */}
                <div>
                  <Label htmlFor="create-confirm-password">Confirm Password</Label>
                  <PasswordInput
                    id="create-confirm-password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={6}
                    disabled={authLoading}
                  />
                </div>

                <div className="border-t pt-4 mt-4">
                  <h3 className="font-medium mb-3">Group Details</h3>

                  {/* Group Name */}
                  <div className="space-y-2 mb-4">
                    <Label htmlFor="group-name">Group Name *</Label>
                    <Input
                      id="group-name"
                      placeholder="My Awesome Group"
                      value={groupName}
                      onChange={(e) => setGroupName(e.target.value)}
                      required
                      maxLength={100}
                      disabled={groupLoading}
                    />
                  </div>

                  {/* Group Description */}
                  <div className="space-y-2">
                    <Label htmlFor="group-description">Description (Optional)</Label>
                    <Input
                      id="group-description"
                      placeholder="What's this group about?"
                      value={groupDescription}
                      onChange={(e) => setGroupDescription(e.target.value)}
                      maxLength={500}
                      disabled={groupLoading}
                    />
                  </div>
                </div>

                {/* Errors */}
                {authError && (
                  <Alert variant="destructive">
                    <AlertDescription>{authError}</AlertDescription>
                  </Alert>
                )}
                {groupError && (
                  <Alert variant="destructive">
                    <AlertDescription>{groupError}</AlertDescription>
                  </Alert>
                )}

                {/* Success */}
                {groupSuccess && (
                  <Alert>
                    <AlertDescription>{groupSuccess}</AlertDescription>
                  </Alert>
                )}

                {/* Submit */}
                <Button
                  type="submit"
                  className="w-full"
                  disabled={authLoading || groupLoading}
                >
                  {authLoading || groupLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create Account & Group'
                  )}
                </Button>
              </form>
            </TabsContent>

            {/* Join Group Tab */}
            <TabsContent value="join" className="space-y-4 mt-4">
              <form onSubmit={handleJoinGroup} className="space-y-4">
                {/* Email */}
                <div>
                  <Label htmlFor="join-email">Email</Label>
                  <Input
                    id="join-email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={authLoading}
                  />
                </div>

                {/* Password */}
                <div>
                  <Label htmlFor="join-password">Password</Label>
                  <PasswordInput
                    id="join-password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    disabled={authLoading}
                  />
                </div>

                {/* Confirm Password */}
                <div>
                  <Label htmlFor="join-confirm-password">Confirm Password</Label>
                  <PasswordInput
                    id="join-confirm-password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={6}
                    disabled={authLoading}
                  />
                </div>

                <div className="border-t pt-4 mt-4">
                  <h3 className="font-medium mb-3">Join Existing Group</h3>

                  {/* Group Code */}
                  <div className="space-y-2">
                    <Label htmlFor="group-code">Group Code *</Label>
                    <Input
                      id="group-code"
                      placeholder="ABC12345"
                      value={groupCode}
                      onChange={(e) => setGroupCode(e.target.value.toUpperCase())}
                      required
                      maxLength={12}
                      disabled={joinLoading}
                      className="font-mono uppercase"
                    />
                    <p className="text-xs text-muted-foreground">
                      Enter the group code provided by your group admin
                    </p>
                  </div>
                </div>

                {/* Errors */}
                {authError && (
                  <Alert variant="destructive">
                    <AlertDescription>{authError}</AlertDescription>
                  </Alert>
                )}
                {joinError && (
                  <Alert variant="destructive">
                    <AlertDescription>{joinError}</AlertDescription>
                  </Alert>
                )}

                {/* Success */}
                {joinSuccess && (
                  <Alert>
                    <AlertDescription>{joinSuccess}</AlertDescription>
                  </Alert>
                )}

                {/* Submit */}
                <Button
                  type="submit"
                  className="w-full"
                  disabled={authLoading || joinLoading}
                >
                  {authLoading || joinLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Joining...
                    </>
                  ) : (
                    'Create Account & Join Group'
                  )}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          {/* Login Link */}
          <div className="mt-6 text-center text-sm">
            Already have an account?{' '}
            <Button
              variant="link"
              className="p-0"
              onClick={() => router.push('/login')}
            >
              Sign in
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
