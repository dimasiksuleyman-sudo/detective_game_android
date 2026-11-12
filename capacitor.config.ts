import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.example.interrogation',
  appName: 'Комната допросов',
  webDir: 'dist',
  server: { androidScheme: 'https', cleartext: false },
};
export default config;
