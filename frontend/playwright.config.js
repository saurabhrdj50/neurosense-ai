// @ts-check
import { defineConfig, devices } from '@playwright/test'
import process from 'node:process'

/**
 * End-to-end tests for the full stack:
 *   - backend: uvicorn (SQLite, demo seed) on :10000
 *   - frontend: vite dev server (proxies /api) on :3000
 *
 * Run locally:  npx playwright install chromium && npm run e2e
 * The analysis pipeline's heavy ML deps are lazy imports, so the spec runs
 * against a backend without torch/whisper — MRI predictions surface as a
 * module warning on the results page and the flow still completes.
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 120_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: [
    {
      // npm script cds into backend; prefers the local venv, falls back to
      // the active python (CI installs backend deps into the system env).
      command: 'npm run e2e:backend',
      url: 'http://localhost:10000/api/health',
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
    {
      command: 'npm run dev',
      url: 'http://localhost:3000',
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
  ],
})
