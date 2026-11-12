import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.example.interrogation',
  appName: 'Комната допросов',
  webDir: 'dist',
  loggingBehavior: 'none',
  server: { androidScheme: 'https', cleartext: false },
};
export default config;
