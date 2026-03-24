const fs = require('fs');
const path = require('path');
const { defineConfig, devices } = require('@playwright/test');

const rootDir = path.resolve(__dirname, '..');
const chromiumPath = process.env.PLAYWRIGHT_CHROMIUM_PATH || '/snap/bin/chromium';
const hasSystemChromium = fs.existsSync(chromiumPath);
const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:4173';
const skipWebServer = process.env.PLAYWRIGHT_SKIP_WEBSERVER === '1';

const launchOptions = {
  args: ['--no-sandbox'],
};

if (hasSystemChromium) {
  launchOptions.executablePath = chromiumPath;
}

module.exports = defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 30_000,
  expect: {
    timeout: 10_000,
  },
  reporter: [['list']],
  use: {
    baseURL,
    headless: true,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    launchOptions,
  },
  webServer: skipWebServer ? undefined : [
    {
      command: './scripts/e2e-api.sh',
      cwd: rootDir,
      url: 'http://127.0.0.1:3001/api/health',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      command: './scripts/dev-web.sh --port 4173 --host 0.0.0.0',
      cwd: rootDir,
      url: 'http://127.0.0.1:4173',
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
  ],
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
      },
    },
  ],
});
