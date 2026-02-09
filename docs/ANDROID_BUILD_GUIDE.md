# Android Build Guide

Complete guide to building and running the Bulletin app on Android using Capacitor.

## Architecture: Hybrid App (Server Mode)

**Important**: This app uses **Capacitor Server Mode**, not static export. The Android app loads your live Next.js deployment (Vercel or localhost) while providing native features like push notifications.

**Why Server Mode?**
- ✅ Server Actions continue to work (required for database operations)
- ✅ No refactoring needed
- ✅ Dynamic routes work perfectly
- ✅ All Next.js features available
- ✅ Still get native APIs (push notifications, camera, etc.)

## Prerequisites

### 1. Install Android Studio
Download from: https://developer.android.com/studio

### 2. Install Java Development Kit (JDK)
- **Required**: JDK 17 or higher
- Check version: `java -version`

**On Linux (Arch/Manjaro):**
```bash
sudo pacman -S jdk-openjdk
```

**On Ubuntu/Debian:**
```bash
sudo apt install openjdk-17-jdk
```

**On macOS:**
```bash
brew install openjdk@17
```

### 3. Configure Android SDK
After installing Android Studio:
1. Open Android Studio
2. Go to **Settings** → **Appearance & Behavior** → **System Settings** → **Android SDK**
3. Install:
   - **Android SDK Platform 34** (or latest)
   - **Android SDK Build-Tools** (latest)
   - **Android SDK Command-line Tools**
   - **Android Emulator** (if testing on emulator)

### 4. Set Environment Variables
Add to your `~/.bashrc` or `~/.zshrc`:

```bash
# Android SDK
export ANDROID_HOME="$HOME/Android/Sdk"
export PATH="$PATH:$ANDROID_HOME/platform-tools"
export PATH="$PATH:$ANDROID_HOME/tools"
export PATH="$PATH:$ANDROID_HOME/cmdline-tools/latest/bin"
```

Reload: `source ~/.bashrc` (or `~/.zshrc`)

Verify: `adb --version`

---

## Development Setup

### 1. Configure Server URL

**For Development (Local Testing):**
```bash
# Start Next.js dev server
pnpm dev
```

The app will load `http://localhost:3000` by default (configured in `capacitor.config.ts`)

**For Production (Vercel):**

Edit `capacitor.config.ts` and update the server URL:
```typescript
server: {
  url: 'https://your-app.vercel.app', // Your Vercel URL
  androidScheme: 'https'
}
```

Or use environment variable:
```bash
export CAPACITOR_SERVER_URL=https://your-app.vercel.app
```

### 2. Sync Capacitor
Every time you change config, run:
```bash
pnpm run cap:sync
```

### 3. Open in Android Studio
```bash
pnpm run cap:open:android
```

This opens the Android project in Android Studio.

---

## Building the App

### Option 1: Run on Emulator

1. **Create an Emulator** (first time only):
   - In Android Studio: **Device Manager** → **Create Device**
   - Select device (e.g., Pixel 6)
   - Download system image (Android 14 / API 34 recommended)
   - Create and start emulator

2. **Run the app:**
   ```bash
   # From project root
   pnpm run android:dev

   # Or from Android Studio: Click the green "Run" button
   ```

### Option 2: Run on Physical Device

1. **Enable Developer Options** on your Android phone:
   - Go to **Settings** → **About Phone**
   - Tap **Build Number** 7 times
   - Go back → **Developer Options** → Enable **USB Debugging**

2. **Connect phone via USB**

3. **Verify connection:**
   ```bash
   adb devices
   # Should show your device
   ```

4. **Run the app:**
   ```bash
   pnpm run android:dev
   ```

### Option 3: Build APK for Distribution

#### Debug APK (for testing)

```bash
cd android
./gradlew assembleDebug
```

APK location: `android/app/build/outputs/apk/debug/app-debug.apk`

Install on device:
```bash
adb install android/app/build/outputs/apk/debug/app-debug.apk
```

#### Release APK (for production)

1. **Generate Signing Key** (first time only):
```bash
cd android/app
keytool -genkey -v -keystore bulletin-release-key.keystore \
  -alias bulletin -keyalg RSA -keysize 2048 -validity 10000
```

Save the password securely!

2. **Configure Signing** in `android/app/build.gradle`:

Add above `android {`:
```gradle
def keystoreProperties = new Properties()
def keystorePropertiesFile = rootProject.file('key.properties')
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
}
```

Inside `android {`, add:
```gradle
signingConfigs {
    release {
        keyAlias keystoreProperties['keyAlias']
        keyPassword keystoreProperties['keyPassword']
        storeFile keystoreProperties['storeFile'] ? file(keystoreProperties['storeFile']) : null
        storePassword keystoreProperties['storePassword']
    }
}
buildTypes {
    release {
        signingConfig signingConfigs.release
        minifyEnabled false
        proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
    }
}
```

3. **Create `android/key.properties`:**
```properties
storePassword=your_keystore_password
keyPassword=your_key_password
keyAlias=bulletin
storeFile=app/bulletin-release-key.keystore
```

**⚠️ NEVER commit `key.properties` or `.keystore` files to git!**

4. **Build Release APK:**
```bash
cd android
./gradlew assembleRelease
```

APK location: `android/app/build/outputs/apk/release/app-release.apk`

5. **Build AAB for Play Store:**
```bash
cd android
./gradlew bundleRelease
```

AAB location: `android/app/build/outputs/bundle/release/app-release.aab`

---

## Testing

### Test Development Mode (Local)
1. Start Next.js: `pnpm dev` (runs on http://localhost:3000)
2. Run Android app: `pnpm run android:dev`
3. App should load your local Next.js server
4. Make changes → they'll appear after refresh (or hot reload if configured)

**Ensure your phone and computer are on the same network!**

### Test Production Mode (Vercel)
1. Deploy to Vercel: `vercel --prod`
2. Update `capacitor.config.ts` with Vercel URL
3. Sync: `pnpm run cap:sync`
4. Run Android app
5. App should load your Vercel deployment

### Test Offline Behavior
The app **requires internet** in server mode (it's loading a website). For offline functionality, you'd need to implement:
- Service workers for caching
- Or switch to static export mode (requires refactoring Server Actions)

---

## Common Issues

### Issue: "localhost:3000 refused to connect" on Android
**Cause**: Android emulator/device can't reach your computer's localhost

**Solutions:**
1. **Use your local IP address** instead of localhost:
   ```typescript
   // capacitor.config.ts
   server: {
     url: 'http://192.168.1.XXX:3000', // Your computer's IP
     cleartext: true
   }
   ```

   Find your IP: `ip addr show` (Linux) or `ipconfig` (Windows)

2. **For emulator only**, use Android's special IP:
   ```typescript
   url: 'http://10.0.2.2:3000'
   ```

### Issue: "Mixed Content" errors
**Cause**: Android blocks HTTP content by default

**Solution**: Already configured in `capacitor.config.ts`:
```typescript
android: {
  allowMixedContent: true
}
```

### Issue: Changes not appearing in app
**Solution**:
```bash
pnpm run cap:sync  # Sync changes
# Then rerun the app
```

### Issue: Gradle build fails
**Common causes:**
- JDK version mismatch (need JDK 17+)
- Gradle cache corruption

**Solutions:**
```bash
cd android
./gradlew clean
./gradlew build --refresh-dependencies
```

### Issue: "SDK location not found"
**Solution:** Create `android/local.properties`:
```properties
sdk.dir=/home/YOUR_USERNAME/Android/Sdk
```

---

## Development Workflow

**Typical workflow:**
1. Make changes to Next.js code
2. Test in browser first (`pnpm dev`)
3. Once working, test in Android:
   ```bash
   pnpm run android:dev
   ```
4. For native features (push notifications), must test on physical device or emulator

**Quick iterations:**
- No need to run `cap sync` unless you change `capacitor.config.ts` or native plugins
- Just rebuild/rerun the Android app

---

## Next Steps

1. ✅ **Phase 1 Complete**: Capacitor setup done, Android app working
2. 🔜 **Phase 2**: Set up Firebase Cloud Messaging (see `CAPACITOR_MOBILE_PLAN.md`)
3. 🔜 **Phase 3**: Implement push notifications

---

## Useful Commands

```bash
# Development
pnpm dev                      # Start Next.js dev server
pnpm run cap:sync             # Sync Capacitor config
pnpm run cap:open:android     # Open Android Studio
pnpm run android:dev          # Sync + run on device

# Building
cd android && ./gradlew assembleDebug    # Build debug APK
cd android && ./gradlew assembleRelease  # Build release APK
cd android && ./gradlew bundleRelease    # Build AAB for Play Store

# Utilities
adb devices                   # List connected devices
adb logcat                    # View Android logs
adb install path/to/app.apk  # Install APK
```

---

## Resources

- **Capacitor Docs**: https://capacitorjs.com/docs
- **Android Studio**: https://developer.android.com/studio
- **Capacitor Server Mode**: https://capacitorjs.com/docs/guides/live-reload
- **Gradle Guide**: https://docs.gradle.org/current/userguide/userguide.html

---

Last updated: 2026-02-09
