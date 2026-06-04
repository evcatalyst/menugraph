const { defineConfig } = require("@playwright/test");

const port = Number(process.env.PORT || 4173);
const baseURL = process.env.PLAYWRIGHT_BASE_URL || `http://127.0.0.1:${port}`;

module.exports = defineConfig({
  testDir: "./tests",
  timeout: 30_000,
  expect: {
    timeout: 8_000,
  },
  use: {
    baseURL,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  webServer: {
    command: `env PORT=${port} npm run dev`,
    url: baseURL,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
