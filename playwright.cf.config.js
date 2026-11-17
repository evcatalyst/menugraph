const { defineConfig } = require("@playwright/test");

module.exports = defineConfig({
  testDir: "./tests",
  testMatch: "cf-smoke.spec.js",
  timeout: 60_000,
  use: {
    baseURL: "http://127.0.0.1:8787",
  },
  webServer: {
    command: "npx wrangler@4.50.0 dev --port 8787 --ip 127.0.0.1",
    url: "http://127.0.0.1:8787/",
    reuseExistingServer: false,
    timeout: 180_000,
  },
});
