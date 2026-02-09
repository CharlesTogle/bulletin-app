# Capacitor Mobile App & Push Notifications Plan

## Overview

Transform the Bulletin web app into a native Android (and iOS) application using Capacitor, with full push notification support for:
- New announcements created in groups
- Deadline reminders (24 hours before)
- Firebase Cloud Messaging (FCM) integration

## Architecture Decision: Hybrid App (Server Mode)

**✅ Using Capacitor Server Mode** - Android app loads the live Next.js deployment (Vercel or localhost)

**Why?**
- Server Actions continue to work (required for database operations per CLAUDE.md)
- No refactoring needed - all existing code works as-is
- Dynamic routes and Next.js features fully supported
- Still get native APIs (push notifications, camera, etc.)

**Alternative (NOT used):**
- Static export mode would require refactoring all Server Actions to client-side Supabase calls
- Goes against project's strict "Server Actions ONLY" architecture
- Would be a massive breaking change

See `docs/ANDROID_BUILD_GUIDE.md` for complete build instructions.

---

## Todo List

### Phase 1: Capacitor Setup & Configuration ✅

- [x] Install Capacitor dependencies
  ```bash
  pnpm add @capacitor/core @capacitor/cli
  pnpm add @capacitor/android
  pnpm add @capacitor/push-notifications
  pnpm add @capacitor/local-notifications
  ```

- [x] Initialize Capacitor (auto-initialized when adding Android)

- [x] Create `capacitor.config.ts` in project root
  - Configured for **server mode** (points to live URL, not static files)
  - Set server.url with environment variable support
  - Configure androidScheme to 'https'
  - Configure PushNotifications plugin settings

- [x] ~~Update `next.config.js` for static export~~ (NOT NEEDED - using server mode)

- [x] Add Android platform
  ```bash
  pnpm exec cap add android
  ```

- [x] Sync Capacitor configuration
  ```bash
  pnpm exec cap sync
  ```

- [x] Add helpful npm scripts to `package.json`
- [x] Create `.capacitor.env.example` for URL configuration
- [x] Update `.gitignore` for Android build artifacts
- [x] Create `docs/ANDROID_BUILD_GUIDE.md` with complete instructions

### Phase 2: Firebase Cloud Messaging Setup

- [ ] Create Firebase project (or use existing)
  - Go to https://console.firebase.google.com/
  - Create new project: "Bulletin App"

- [ ] Add Android app to Firebase project
  - Package name: `com.bulletinapp.app`
  - Download `google-services.json`
  - Place in `android/app/` directory

- [ ] Configure Android project for FCM
  - Update `android/app/build.gradle` with FCM dependencies
  - Update `android/build.gradle` with Google services plugin

- [ ] Get FCM Server Key
  - Firebase Console → Project Settings → Cloud Messaging
  - Copy Server Key for edge functions

- [ ] Store FCM Server Key in Supabase secrets
  ```bash
  supabase secrets set FCM_SERVER_KEY=your_server_key_here
  ```

### Phase 3: Database Schema for Notifications

- [ ] Create migration `20260209190000_add_fcm_tokens.sql`
  - Create `fcm_tokens` table (user_id, token, device_type, timestamps)
  - Add indexes on user_id and token
  - Enable RLS with policies for user token management

- [ ] Add notification fields to `announcements` table
  - `notify_on_create BOOLEAN DEFAULT true`
  - `deadline TIMESTAMPTZ`
  - `deadline_reminder_sent BOOLEAN DEFAULT false`
  - Index on deadline for reminder queries

- [ ] Run migration
  ```bash
  supabase db push
  ```

- [ ] Verify tables created in Supabase dashboard

### Phase 4: Server Actions for FCM Token Management

- [ ] Create `actions/notifications.ts` with:
  - `registerFCMToken(token, deviceType)` - Upsert token to database
  - `unregisterFCMToken(token)` - Remove token when app uninstalled
  - Proper error handling and return types

- [ ] Add type definitions to `types/database.ts`
  - `FCMToken` interface
  - Device type enum

### Phase 5: Client-Side Push Notification Hook

- [ ] Create `lib/hooks/usePushNotifications.ts`
  - Check if running on native platform (Capacitor.isNativePlatform())
  - Request push notification permissions
  - Register with FCM and get token
  - Handle registration success/errors
  - Listen for push notification received
  - Listen for push notification tapped (deep linking)
  - Register token with backend via Server Action

- [ ] Add hook to root layout `app/layout.tsx`
  - Initialize push notifications on app start
  - Ensure runs client-side only

- [ ] Test registration flow on Android device/emulator

### Phase 6: Supabase Edge Functions

#### Edge Function: Send Push Notification

- [ ] Create `supabase/functions/send-push-notification/index.ts`
  - Accept payload: `{ userIds, title, body, data }`
  - Query `fcm_tokens` for specified user IDs
  - Send FCM request to each token
  - Use FCM Server Key from environment
  - Return success/failure count

- [ ] Deploy edge function
  ```bash
  supabase functions deploy send-push-notification
  ```

- [ ] Test edge function with curl/Postman

#### Edge Function: Check Deadlines

- [ ] Create `supabase/functions/check-deadlines/index.ts`
  - Query announcements with deadlines in next 24 hours
  - Filter where `deadline_reminder_sent = false`
  - Get group members for each announcement
  - Call `send-push-notification` function
  - Update `deadline_reminder_sent = true`

- [ ] Deploy edge function
  ```bash
  supabase functions deploy check-deadlines
  ```

- [ ] Test deadline check function manually

### Phase 7: Integrate Notifications with Announcements

- [ ] Update `actions/announcements.ts` - `createAnnouncement()`
  - Add optional `notifyMembers` parameter to form data
  - After creating announcement, query group members
  - Call `send-push-notification` edge function
  - Pass announcement details and deep link data

- [ ] Update `components/announcements/CreateAnnouncementForm.tsx`
  - Add checkbox: "Notify group members"
  - Add optional deadline picker (date + time)
  - Update form submission to include new fields

- [ ] Test notification flow:
  - Create announcement with "Notify members" checked
  - Verify push notification received on Android device

### Phase 8: Schedule Deadline Reminders

- [ ] Enable pg_cron extension in Supabase
  ```sql
  CREATE EXTENSION IF NOT EXISTS pg_cron;
  ```

- [ ] Create cron job to check deadlines every hour
  - Schedule: `'0 * * * *'` (every hour)
  - Calls `check-deadlines` edge function via HTTP

- [ ] Test cron job:
  - Create announcement with deadline in 23 hours
  - Wait for hourly check
  - Verify notification sent

### Phase 9: Deep Linking & Navigation

- [ ] Configure Android deep links in `AndroidManifest.xml`
  - Add intent filters for `bulletinapp://` scheme
  - Handle `/groups/:groupId/announcements/:announcementId` routes

- [ ] Implement navigation handler in `usePushNotifications.ts`
  - Extract `announcementId` and `groupId` from notification data
  - Navigate to correct page when notification tapped

- [ ] Test deep linking:
  - Send notification with data payload
  - Tap notification
  - Verify correct page opens

### Phase 10: Build & Deploy

- [ ] Update build scripts in `package.json`
  ```json
  {
    "scripts": {
      "build:mobile": "next build && cap sync",
      "android": "cap open android"
    }
  }
  ```

- [ ] Generate signed APK/AAB
  - Create keystore in Android Studio
  - Configure signing in `build.gradle`
  - Build release APK/AAB

- [ ] Test on physical Android device
  - Install APK
  - Test all notification scenarios
  - Test offline functionality

- [ ] Prepare for Play Store submission
  - Create app listing
  - Upload screenshots
  - Submit for review

---

## Optional Enhancements

### User Notification Preferences

- [ ] Create `notification_preferences` table
  - Settings: announcements, deadlines, comments, votes
  - Per-group notification settings

- [ ] Add notification settings page
  - Toggle switches for each notification type
  - Per-group overrides

- [ ] Update edge functions to respect preferences
  - Filter recipients based on preferences
  - Don't send if user opted out

### Notification Channels (Android)

- [ ] Configure notification channels in Android
  - Channel 1: Announcements (high priority)
  - Channel 2: Deadlines (high priority)
  - Channel 3: Social (likes, comments) - low priority

- [ ] Update push notification payloads
  - Include channel ID in FCM payload
  - Let users manage channels in system settings

### Badge Count

- [ ] Track unread announcements count
  - Add `read_announcements` table or flag
  - Update count on announcement creation

- [ ] Update app badge
  - Use Capacitor Badge plugin
  - Update badge on notification received
  - Clear badge when app opened

### iOS Support

- [ ] Add iOS platform
  ```bash
  pnpm add @capacitor/ios
  pnpm exec cap add ios
  ```

- [ ] Configure Apple Developer account
  - Enable Push Notifications capability
  - Create APNs certificate

- [ ] Update Firebase project
  - Add iOS app
  - Upload APNs certificate
  - Download `GoogleService-Info.plist`

- [ ] Test on iOS device
  - Build in Xcode
  - Test push notifications

---

## Testing Checklist

### Unit Tests
- [ ] FCM token registration/unregistration actions
- [ ] Notification edge functions (mock FCM API)
- [ ] Deadline calculation logic

### Integration Tests
- [ ] End-to-end notification flow (create announcement → receive push)
- [ ] Deadline reminder flow (set deadline → receive reminder)
- [ ] Deep linking navigation

### Manual Testing
- [ ] Install app on Android device
- [ ] Register for notifications
- [ ] Create announcement in group → verify push received
- [ ] Tap notification → verify correct page opens
- [ ] Set announcement with deadline → verify reminder received
- [ ] Uninstall app → verify token removed from database
- [ ] Test with multiple devices
- [ ] Test with notifications disabled in system settings

---

## Environment Variables Required

Add to `.env.local` and Supabase secrets:

```bash
# Firebase
FCM_SERVER_KEY=your_fcm_server_key_here

# Supabase (already configured)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

---

## Documentation Updates

- [ ] Update `CLAUDE.md`
  - Add section on mobile app architecture
  - Document notification system
  - Add Capacitor commands to development section

- [ ] Create `docs/MOBILE_SETUP.md`
  - Step-by-step mobile dev setup
  - Android Studio configuration
  - FCM setup guide

- [ ] Create `docs/NOTIFICATIONS.md`
  - How notification system works
  - Adding new notification types
  - Debugging notification issues

---

## Resources

- **Capacitor Docs**: https://capacitorjs.com/docs
- **Capacitor Push Notifications**: https://capacitorjs.com/docs/apis/push-notifications
- **Firebase Cloud Messaging**: https://firebase.google.com/docs/cloud-messaging
- **Supabase Edge Functions**: https://supabase.com/docs/guides/functions
- **Next.js Static Export**: https://nextjs.org/docs/app/building-your-application/deploying/static-exports

---

## Notes

- **Static Export Required**: Capacitor requires Next.js static export (SSG), not SSR
- **Image Optimization**: Must be disabled for static export
- **API Routes**: Don't work in static export - use Supabase edge functions instead
- **Authentication**: Supabase auth works perfectly with Capacitor
- **Permissions**: Android requires notification permissions at runtime
- **Testing**: Use physical device or emulator with Google Play Services

---

## Estimated Timeline

- **Phase 1-2**: Capacitor & Firebase Setup - 2-3 hours
- **Phase 3-4**: Database & Server Actions - 2 hours
- **Phase 5**: Client-side Push Hook - 2 hours
- **Phase 6**: Edge Functions - 3 hours
- **Phase 7**: Announcement Integration - 2 hours
- **Phase 8**: Deadline Reminders - 2 hours
- **Phase 9**: Deep Linking - 1 hour
- **Phase 10**: Build & Deploy - 2-3 hours

**Total Estimated Time**: 16-18 hours

---

## Current Status

✅ **Phase 1 Complete** - Capacitor setup complete, Android app ready to build!

**Completed:**
- ✅ Capacitor installed and configured
- ✅ Android platform added
- ✅ Server mode configured (points to live Next.js deployment)
- ✅ Build scripts added to package.json
- ✅ Complete build documentation created

**Next:** Phase 2 - Firebase Cloud Messaging setup

Last updated: 2026-02-09
