
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.checkapp.app',
  appName: 'CheckApp',
  webDir: 'dist',

  server: {
    androidScheme: 'https',
    cleartext: false,
  },

  android: {
    allowMixedContent: false,
  },
};

export default config;
