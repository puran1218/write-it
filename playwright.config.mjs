import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  testMatch: "*.spec.mjs",
  timeout: 30_000,
  expect: { timeout: 10_000 },
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL: "http://127.0.0.1:8765/zi/",
    browserName: "chromium",
    serviceWorkers: "block", // Online route mocks must see all CDN requests.
  },
  webServer: {
    command: "npm run serve",
    url: "http://127.0.0.1:8765/zi/",
    reuseExistingServer: !process.env.CI,
    timeout: 20_000,
  },
});
