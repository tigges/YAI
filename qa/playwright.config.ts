import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  timeout: 60_000,
  expect: { timeout: 15_000 },
  retries: 1,
  workers: 1,
  grep: process.env['QA_SUITE'] === 'full' ? undefined : /@smoke/,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: process.env['LIVE_URL'] ?? 'https://app.botstudio.uk',
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
})
