const { expect, test } = require("@playwright/test");

async function openPwa(page) {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => localStorage.clear());
  await page.goto("/pwa/");
  await expect(page.locator("#app")).toHaveAttribute("aria-busy", "false", { timeout: 30000 });
  await expect(page.locator(".menu-card:not(.menu-card--under)")).toBeVisible();
}

async function swipeCard(page, deltaX) {
  const card = page.locator(".menu-card:not(.menu-card--under)");
  const box = await card.boundingBox();
  if (!box) throw new Error("The active menu card has no bounding box.");
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + deltaX, y, { steps: 6 });
  await page.mouse.up();
}

test("standalone PWA swipes browse only and gives unidentified menus useful context", async ({ page }) => {
  await openPwa(page);

  const activeCard = page.locator(".menu-card:not(.menu-card--under)");
  const firstId = await activeCard.getAttribute("data-menu-id");
  await expect(page.locator(".gesture-hint")).toHaveText("Swipe left for next · right for previous");

  await swipeCard(page, -130);
  await expect(activeCard).not.toHaveAttribute("data-menu-id", firstId);
  const secondId = await activeCard.getAttribute("data-menu-id");

  await swipeCard(page, 130);
  await expect(activeCard).toHaveAttribute("data-menu-id", firstId);
  const savedAfterSwipe = await page.evaluate(() => localStorage.getItem("menugraph:pwa-lists:v1"));
  expect(savedAfterSwipe).toBeNull();

  await page.locator('.round-action[data-action="save"]').click();
  await page.locator(".save-choices button").first().click();
  await expect(activeCard).toHaveAttribute("data-menu-id", firstId);
  const savedAfterButton = await page.evaluate(() => JSON.parse(localStorage.getItem("menugraph:pwa-lists:v1")));
  expect(savedAfterButton[0].menuIds).toContain(firstId);
  expect(secondId).not.toBe(firstId);

  await page.getByRole("button", { name: "Search menus and collections" }).click();
  const unhelpfulTitle = await page.evaluate(async () => {
    const payload = await fetch("../data/menus.json").then((response) => response.json());
    return payload.menus.find((menu) => /restaurant(?: name)? and\s*\/?\s*or location not given/i.test(String(menu.title || "")))?.title;
  });
  expect(unhelpfulTitle).toBeTruthy();
  await page.locator('.search-form input[type="search"]').fill(unhelpfulTitle);
  await page.locator(".search-form").press("Enter");
  await page.locator(".build-deck").click();
  await expect(activeCard.locator("h2")).toHaveText(/menu · venue unidentified/i);
  await expect(activeCard.locator(".card-context")).toContainText(/venue|listed|recorded/i);
  await expect(activeCard.locator(".card-meta")).toContainText(/NYPL|CIA/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(391);
});
