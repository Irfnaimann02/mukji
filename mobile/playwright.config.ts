import { defineConfig } from '@playwright/test';

// Week 12 pre-deploy smoke test: clicks through the web version with the
// real Supabase data (mobile/.env). Read-only: it never writes to the database.
// Run: npm run e2e   (starts the web app by itself, or reuses one on port 8099)

const PORT = 8099;

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.e2e.ts', // not *.test.ts, so Jest leaves these alone
  timeout: 60_000,
  expect: { timeout: 15_000 },
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${PORT}`,
    // Uses a browser already on the laptop, so no download: Edge on Windows
    // (always installed), Chrome elsewhere. Override with E2E_CHANNEL=chrome.
    channel: process.env.E2E_CHROME_PATH
      ? undefined
      : (process.env.E2E_CHANNEL ?? (process.platform === 'win32' ? 'msedge' : 'chrome')),
    launchOptions: process.env.E2E_CHROME_PATH ? { executablePath: process.env.E2E_CHROME_PATH } : undefined,
    viewport: { width: 420, height: 900 },
    // Pretend to stand at Hanyang ERICA, so "nearby" means our restaurants.
    geolocation: { latitude: 37.2967, longitude: 126.836 },
    permissions: ['geolocation'],
    locale: 'en-US',
  },
  webServer: {
    command: `npx expo start --web --port ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: true,
    timeout: 240_000,
    env: { CI: '1' },
  },
});
