import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.bulletinapp.app',
  appName: 'Bulletin',
  webDir: 'out', // Not used in server mode, but required
  server: {
    // Point to your Vercel deployment in production
    // For development, use: 'http://localhost:3000'
    url: process.env.CAPACITOR_SERVER_URL || 'http://localhost:3000',
    cleartext: true, // Allow HTTP for localhost development
    androidScheme: 'https'
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert']
    },
    LocalNotifications: {
      smallIcon: 'ic_stat_icon_config_sample',
      iconColor: '#488AFF'
    }
  },
  android: {
    allowMixedContent: true // Allow HTTP for development
  }
};

export default config;
