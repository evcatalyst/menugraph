const fs = require("fs");
const path = require("path");
const { chromium } = require("@playwright/test");

const baseUrl = (process.env.MENUGRAPH_URL || "http://127.0.0.1:4173").replace(/\/+$/, "");
const outputDir = path.join(__dirname, "..", "docs", "mobile-lab-screenshots");

async function waitForLab(page) {
  await page.locator("#mobile-lab-root").waitFor({ state: "visible" });
  await page.locator(".mobile-lab-loading").waitFor({ state: "detached", timeout: 15000 }).catch(async () => {
    await page.locator(".mobile-lab-loading").waitFor({ state: "hidden", timeout: 15000 });
  });
}

async function capture(page, query, filename, interact) {
  await page.goto(`${baseUrl}/${query}`);
  await waitForLab(page);
  if (interact) await interact(page);
  await page.screenshot({ path: path.join(outputDir, filename), fullPage: false });
}

(async () => {
  fs.mkdirSync(outputDir, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });

  await capture(page, "?mobileLab=1&mobileVariant=hybrid", "discovery-home.png");
  await capture(page, "?mobileLab=1&mobileVariant=cards", "detail-state.png", async (page) => {
    await page.locator(".mobile-menu-card").first().click();
    await page.locator(".mobile-detail-sheet").waitFor({ state: "visible" });
  });
  await capture(page, "?mobileLab=1&mobileVariant=chat", "ask-state.png");
  await capture(page, "?mobileLab=1&mobileVariant=recipe", "recipe-state.png");

  await browser.close();
  console.log(`Captured mobile lab screenshots in ${outputDir}`);
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
