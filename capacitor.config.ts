import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Optional native Android shell.
 * The web app is a full PWA — this config only exists so an installable
 * APK can be produced from the same codebase (see .github/workflows/android-apk.yml).
 */
const config: CapacitorConfig = {
  appId: 'in.hisaabkitaab.app',
  appName: 'HisaabKitaab',
  webDir: 'dist',
  android: {
    backgroundColor: '#FFF8EE',
  },
  server: {
    androidScheme: 'https',
  },
};

export default config;
