import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: { baseURL: 'http://127.0.0.1:4173', trace: 'retain-on-failure' },
  projects: [
    {
      name: 'phone-360',
      use: { browserName: 'chromium', viewport: { width: 360, height: 800 } },
    },
    {
      name: 'phone-412',
      use: { browserName: 'chromium', viewport: { width: 412, height: 915 } },
    },
  ],
  webServer: {
    command:
      'npm run build:e2e && npm run preview -- --outDir dist-e2e --port 4173 --strictPort',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: false,
  },
});
