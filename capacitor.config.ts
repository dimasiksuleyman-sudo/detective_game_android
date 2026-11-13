import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.example.interrogation',
  appName: 'Комната допросов',
  webDir: 'dist',
  loggingBehavior: 'none',
  plugins: {
    SplashScreen: {
      launchAutoHide: false,
      launchFadeOutDuration: 0,
      showSpinner: false,
      backgroundColor: '#12181D',
    },
  },
  server: { androidScheme: 'https', cleartext: false },
};
export default config;
