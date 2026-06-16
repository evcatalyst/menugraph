const { defineConfig } = require("@playwright/test");

const port = Number(process.env.PLAYWRIGHT_PORT || process.env.PORT || 4173);
const baseURL = `http://127.0.0.1:${port}`;

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
    command: "npm run dev",
    url: baseURL,
    env: {
      PORT: String(port),
    },
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
