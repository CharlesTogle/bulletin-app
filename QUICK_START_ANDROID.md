# Quick Start: Test Android App NOW

Follow these steps to see your Bulletin app running on Android in the next 10 minutes!

## Prerequisites Check

```bash
# 1. Check if Android Studio is installed
which android-studio
# If not installed: https://developer.android.com/studio

# 2. Check if Java is installed (need JDK 17+)
java -version
# If not installed: sudo pacman -S jdk-openjdk (Arch) or sudo apt install openjdk-17-jdk (Ubuntu)

# 3. Check if adb is available
adb --version
# If not: Add $ANDROID_HOME/platform-tools to PATH (see docs/ANDROID_BUILD_GUIDE.md)
```

## Option 1: Test on Physical Android Device (Recommended)

### Step 1: Enable USB Debugging on Your Phone
1. Go to **Settings** → **About Phone**
2. Tap **Build Number** 7 times (enables Developer Options)
3. Go back → **Developer Options** → Enable **USB Debugging**
4. Connect phone to computer via USB

### Step 2: Start Your Next.js Dev Server
```bash
# From project root
pnpm dev
```

Keep this running! The Android app will load from this server.

### Step 3: Configure Capacitor to Use Your Computer's IP

Find your local IP address:
```bash
# Linux/Mac
ip addr show | grep "inet " | grep -v 127.0.0.1

# Or just
hostname -I
```

You'll get something like `192.168.1.XXX`

Edit `capacitor.config.ts`, replace this line:
```typescript
url: process.env.CAPACITOR_SERVER_URL || 'http://localhost:3000',
```

With your IP:
```typescript
url: 'http://192.168.1.XXX:3000', // Replace XXX with your IP
```

Sync:
```bash
pnpm run cap:sync
```

### Step 4: Verify Device Connection
```bash
adb devices
# Should show your device in the list
```

If it says "unauthorized", check your phone for a permission prompt and tap "Allow".

### Step 5: Run the App!
```bash
pnpm run android:dev
```

This will:
1. Open Android Studio (first time may take a minute)
2. Build the app
3. Install it on your phone
4. Launch it!

**You should see your Bulletin app running on your phone! 🎉**

---

## Option 2: Test on Android Emulator

### Step 1: Create an Emulator (First Time Only)

Open Android Studio:
```bash
pnpm run cap:open:android
```

1. Click **Device Manager** (phone icon in top-right)
2. Click **Create Device**
3. Select **Pixel 6** (or any phone)
4. Click **Next**
5. Select **API Level 34** (or latest), click **Download** if needed
6. Click **Next** → **Finish**
7. Click the **Play** button to start emulator

### Step 2: Start Next.js Dev Server
```bash
pnpm dev
```

### Step 3: Configure for Emulator

Android emulator has a special IP to access your computer's localhost:

Edit `capacitor.config.ts`:
```typescript
url: 'http://10.0.2.2:3000',
```

Sync:
```bash
pnpm run cap:sync
```

### Step 4: Run the App
```bash
pnpm run android:dev
```

App will launch in the emulator!

---

## Option 3: Build APK to Install Manually

If the above methods don't work, build an APK:

```bash
cd android
./gradlew assembleDebug
cd ..
```

APK location: `android/app/build/outputs/apk/debug/app-debug.apk`

Install on device:
```bash
adb install android/app/build/outputs/apk/debug/app-debug.apk
```

Or email yourself the APK and install on your phone (requires enabling "Install from Unknown Sources").

---

## Troubleshooting

### "localhost refused to connect"
- **Physical device**: Use your computer's IP (192.168.x.x), not localhost
- **Emulator**: Use `10.0.2.2` instead of localhost
- Make sure phone and computer are on same WiFi network

### "adb: command not found"
Add to `~/.bashrc`:
```bash
export ANDROID_HOME="$HOME/Android/Sdk"
export PATH="$PATH:$ANDROID_HOME/platform-tools"
```

Then: `source ~/.bashrc` and `adb --version`

### Android Studio won't open
```bash
# First time may need to install
sudo pacman -S android-studio  # Arch
# Or download from: https://developer.android.com/studio
```

### Gradle build fails
```bash
cd android
./gradlew clean
./gradlew build --refresh-dependencies
```

### "SDK location not found"
Create `android/local.properties`:
```properties
sdk.dir=/home/YOUR_USERNAME/Android/Sdk
```

---

## What You Should See

1. **Splash screen** with Capacitor logo
2. **Your Bulletin app** loading from Next.js dev server
3. All features should work (login, groups, announcements)
4. Any changes you make to code will appear after page refresh

---

## Next: Add Push Notifications

Once you have the app running, proceed to **Phase 2** in `CAPACITOR_MOBILE_PLAN.md` to add Firebase Cloud Messaging and push notifications!

---

**Need help?** See full guide: `docs/ANDROID_BUILD_GUIDE.md`
