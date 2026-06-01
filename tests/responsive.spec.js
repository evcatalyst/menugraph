const { expect, test } = require("@playwright/test");

async function openApp(page) {
  await page.goto("/");
  await expect(page.locator("#viz")).toBeVisible();
  await expect(page.locator("#record-count")).toContainText(/CIA|NYPL|menus/i);
}

async function openMobileLab(page, variant = "hybrid") {
  await page.goto(`/?mobileLab=1&mobileVariant=${variant}`);
  await expect(page.locator("#mobile-lab-root")).toBeVisible();
  await expect(page.locator("#mobile-lab-root")).toHaveAttribute("data-variant", variant);
  await expect(page.locator(".mobile-bottom-nav")).toBeVisible();
  await expect(page.locator(".mobile-lab-loading")).toHaveCount(0, { timeout: 15000 });
}

async function unlockAsk(page) {
  const secret = Buffer.from("bWFjZGFkZHk=", "base64").toString("utf8");
  await page.locator(".ask-gate input").fill(secret);
  await page.locator(".ask-gate button").click();
  await expect(page.locator(".ask-gate")).toHaveCount(0);
  await expect(page.locator(".chat-form")).toBeVisible();
}

async function layoutMetrics(page) {
  return page.evaluate(() => {
    const box = (selector) => {
      const el = document.querySelector(selector);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return {
        x: Math.round(r.x),
        y: Math.round(r.y),
        width: Math.round(r.width),
        height: Math.round(r.height),
        right: Math.round(r.right),
        bottom: Math.round(r.bottom),
      };
    };
    return {
      viewport: { width: window.innerWidth, height: window.innerHeight },
      scrollWidth: document.documentElement.scrollWidth,
      scrollHeight: document.documentElement.scrollHeight,
      bodyClass: document.body.className,
      filtersAriaHidden: document.querySelector("#filter-panel")?.getAttribute("aria-hidden"),
      resultScroll: {
        clientWidth: document.querySelector("#result-list")?.clientWidth || 0,
        scrollWidth: document.querySelector("#result-list")?.scrollWidth || 0,
        clientHeight: document.querySelector("#result-list")?.clientHeight || 0,
        scrollHeight: document.querySelector("#result-list")?.scrollHeight || 0,
      },
      boxes: {
        mobileControls: box(".mobile-controls"),
        filters: box(".filters"),
        canvas: box(".canvas-panel"),
        viz: box("#viz"),
        detail: box(".detail"),
        results: box(".results-strip"),
        topbar: box(".topbar"),
        toolbar: box(".canvas-toolbar"),
        chatDataBrowser: box(".chat-data-browser"),
        chatChartRecommendation: box(".chat-chart-recommendation"),
        mobileLabRoot: box("#mobile-lab-root"),
        mobileBottomNav: box(".mobile-bottom-nav"),
        mobileDetailSheet: box(".mobile-detail-sheet"),
      },
    };
  });
}

function expectNoHorizontalOverflow(metrics) {
  expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.viewport.width + 1);
}

function expectDesktopWorkbenchFitsPage(metrics) {
  expect(metrics.scrollHeight).toBeLessThanOrEqual(metrics.viewport.height + 1);
}

function expectNoResultClipping(metrics) {
  expect(metrics.resultScroll.scrollHeight).toBeLessThanOrEqual(metrics.resultScroll.clientHeight + 2);
}

function expectBoxWithinViewport(box, viewport, allowance = 1) {
  expect(box.x).toBeGreaterThanOrEqual(-allowance);
  expect(box.right).toBeLessThanOrEqual(viewport.width + allowance);
}

test("mobile keeps chart-first flow with drawer filters and selectable records", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openApp(page);

  let metrics = await layoutMetrics(page);
  expectNoHorizontalOverflow(metrics);
  await expect(page.locator(".mobile-controls")).toBeVisible();
  expect(metrics.filtersAriaHidden).toBe("true");
  expect(metrics.boxes.mobileControls.y).toBeLessThan(metrics.boxes.canvas.y);
  expect(metrics.boxes.canvas.y).toBeLessThan(metrics.boxes.results.y);
  expect(metrics.boxes.results.y).toBeLessThan(metrics.boxes.detail.y);
  expect(metrics.resultScroll.scrollWidth).toBeGreaterThanOrEqual(metrics.resultScroll.clientWidth);
  expectNoResultClipping(metrics);

  await page.locator("#filter-toggle").click();
  await page.waitForFunction(() => document.querySelector(".filters").getBoundingClientRect().x > -2);
  metrics = await layoutMetrics(page);
  expect(metrics.bodyClass).toContain("filter-drawer-open");
  expect(metrics.filtersAriaHidden).toBe("false");
  expect(metrics.boxes.filters.x).toBeGreaterThanOrEqual(-1);

  await page.locator("#filter-close").click();
  await page.waitForFunction(() => document.querySelector(".filters").getBoundingClientRect().right < 8);
  metrics = await layoutMetrics(page);
  expect(metrics.bodyClass).not.toContain("filter-drawer-open");
  expect(metrics.filtersAriaHidden).toBe("true");

  await page.locator(".result-item").first().click();
  await expect(page.locator("#detail-card")).toBeVisible();
  await page.waitForFunction(() => document.querySelector(".detail").getBoundingClientRect().top < window.innerHeight * 0.4);
});

test("mobile lab hybrid supports mode switching, detail sheets, gated Ask, and provenance-backed inspiration", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openMobileLab(page, "hybrid");
  await expect(page.locator(".mobile-hero")).toBeVisible({ timeout: 15000 });

  let metrics = await layoutMetrics(page);
  expectNoHorizontalOverflow(metrics);
  expectBoxWithinViewport(metrics.boxes.mobileLabRoot, metrics.viewport);
  expectBoxWithinViewport(metrics.boxes.mobileBottomNav, metrics.viewport);
  await expect(page.locator('.mobile-bottom-nav button[data-mobile-mode="discover"]')).toHaveAttribute("aria-current", "page");

  await page.locator('.mobile-bottom-nav button[data-mobile-mode="menus"]').click();
  await expect(page.locator('.mobile-bottom-nav button[data-mobile-mode="menus"]')).toHaveAttribute("aria-current", "page");
  await expect(page.locator(".mobile-menu-card").first()).toBeVisible();
  await page.locator(".mobile-menu-card").first().click();
  await expect(page.locator(".mobile-detail-sheet")).toBeVisible();
  await expect(page.locator(".mobile-detail-sheet .mobile-provenance span").first()).toBeVisible();
  metrics = await layoutMetrics(page);
  expectNoHorizontalOverflow(metrics);
  expectBoxWithinViewport(metrics.boxes.mobileDetailSheet, metrics.viewport);
  await page.locator(".mobile-detail-sheet button").filter({ hasText: "Close" }).click();
  await expect(page.locator(".mobile-detail-sheet")).toHaveCount(0);

  await page.locator('.mobile-bottom-nav button[data-mobile-mode="ask"]').click();
  await expect(page.locator(".mobile-lab-ask .ask-gate")).toBeVisible();
  await expect(page.locator(".mobile-lab-ask .chat-form")).toHaveCount(0);

  await page.locator('.mobile-bottom-nav button[data-mobile-mode="inspire"]').click();
  await expect(page.locator(".mobile-inspiration-card").first()).toContainText("Inspired by menu evidence");
  await expect(page.locator(".mobile-inspiration-card").first()).toContainText("No exact recipe");
  await expect(page.locator(".mobile-inspiration-card .mobile-provenance").first()).toBeVisible();

  metrics = await layoutMetrics(page);
  expectNoHorizontalOverflow(metrics);
});

test("mobile lab variants deep-link to distinct starting modes", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const variants = [
    ["cards", "menus", ".mobile-menu-card"],
    ["journey", "discover", ".mobile-hero"],
    ["chat", "ask", ".mobile-lab-ask .ask-gate"],
    ["recipe", "inspire", ".mobile-inspiration-card"],
    ["hybrid", "discover", ".mobile-hero"],
  ];

  for (const [variant, mode, selector] of variants) {
    await openMobileLab(page, variant);
    await expect(page.locator(`.mobile-bottom-nav button[data-mobile-mode="${mode}"]`)).toHaveAttribute("aria-current", "page");
    await expect(page.locator(selector).first()).toBeVisible({ timeout: 15000 });
    const metrics = await layoutMetrics(page);
    expectNoHorizontalOverflow(metrics);
  }
});

test("mobile Ask is the first-class locked entrypoint and unlocks to an adaptive browser", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openApp(page);

  let metrics = await layoutMetrics(page);
  expectNoHorizontalOverflow(metrics);
  await expect(page.locator("#result-title")).toContainText("Ask Across");
  await expect(page.locator(".chat-panel")).toBeVisible();
  await expect(page.locator(".ask-gate")).toBeVisible();

  await unlockAsk(page);
  await page.locator(".chat-form input").fill("how has the price of steak increased across time by region, break it out by type of steak");
  await page.locator(".chat-form button").click();
  await expect(page.locator(".chat-chart-recommendation")).toBeVisible({ timeout: 15000 });
  await expect(page.locator(".chat-chart-recommendation")).toContainText("Recommended visualization");
  await expect(page.locator(".chat-chart-recommendation")).not.toContainText("ChartSpec");
  await expect(page.locator(".chat-price-lens-toggle button").filter({ hasText: "Today USD" })).toBeVisible();
  await expect(page.locator(".chat-price-lens-toggle button").filter({ hasText: "Raw" })).toBeVisible();
  await page.locator(".chat-price-lens-toggle button").filter({ hasText: "Raw" }).click();
  await expect(page.locator(".chat-price-lens-toggle button").filter({ hasText: "Raw" })).toHaveClass(/active/);
  expect(await page.locator(".chat-chart-toggle button").count()).toBeGreaterThanOrEqual(2);
  await page.locator(".chat-chart-toggle button").nth(1).click();
  await expect(page.locator(".chat-chart-toggle button").nth(1)).toHaveClass(/active/);
  await expect(page.locator(".chat-message--assistant .chat-data-browser")).toBeVisible({ timeout: 15000 });
  await expect(page.locator(".chat-data-browser")).toContainText("Price Evidence Browser");
  await expect(page.locator(".chat-data-browser")).toContainText("Types");
  await expect(page.locator(".chat-data-browser")).toContainText("Regions");

  metrics = await layoutMetrics(page);
  expectNoHorizontalOverflow(metrics);
});

test("Ask API rejects requests without the shared secret", async ({ request }) => {
  const locked = await request.post("/api/chat", { data: { question: "lobster prices in Boston" } });
  expect(locked.status()).toBe(401);
  const unlocked = await request.post("/api/chat", {
    data: {
      question: "lobster prices in Boston",
      askSecretHash: "8f388ed94f5ff3d417b9b3f897bf9fc4d56a2d0dd6778905d8440a938558d30a",
    },
  });
  expect(unlocked.ok()).toBeTruthy();
  const payload = await unlocked.json();
  expect(Array.isArray(payload.matches)).toBeTruthy();
  expect(payload.analysis?.summary?.length).toBeGreaterThan(0);
});

test("Ask recommends toggleable charts for general comparisons", async ({ page }) => {
  await page.setViewportSize({ width: 834, height: 1112 });
  await openApp(page);

  await unlockAsk(page);
  await page.locator(".chat-form input").fill("compare dinner menus by source over time");
  await page.locator(".chat-form button").click();
  await expect(page.locator(".chat-chart-recommendation")).toBeVisible({ timeout: 15000 });
  await expect(page.locator(".chat-chart-recommendation")).toContainText("Recommended visualization");
  await expect(page.locator(".chat-chart-recommendation")).not.toContainText("ChartSpec");
  await expect(page.locator(".chat-diagnostics").first()).toContainText("Query details");
  await expect(page.locator(".chat-diagnostics").first()).toContainText("local-retrieval");
  await expect(page.locator(".chat-diagnostics").first()).toContainText("$0.00");
  await expect(page.locator(".chat-facet-menu--decade .chat-facet-summary__dist i").first()).toBeVisible();
  const decadeOptions = await page.locator(".chat-facet-menu--decade .chat-facet-option span").allTextContents();
  const datedOptions = decadeOptions.filter((label) => /\d{4}s/.test(label));
  const sortedDatedOptions = [...datedOptions].sort((a, b) => Number(a.slice(0, 4)) - Number(b.slice(0, 4)));
  expect(datedOptions).toEqual(sortedDatedOptions);
  await expect(page.locator(".chat-chart-toggle button").filter({ hasText: "Category Comparison" })).toBeVisible();
  await expect(page.locator(".chat-chart-toggle button").filter({ hasText: "Evidence Table" })).toBeVisible();
  await page.locator(".chat-chart-toggle button").filter({ hasText: "Evidence Table" }).click();
  await expect(page.locator(".chat-chart-toggle button").filter({ hasText: "Evidence Table" })).toHaveClass(/active/);
  await expect(page.locator(".chat-chart-table-row").first()).toBeVisible();
  await page.locator(".chat-form input").fill("compare lobster prices in Boston and New York");
  await page.locator(".chat-form button").click();
  await expect(page.locator(".chat-message--user")).toHaveCount(2);
  await expect(page.locator(".chat-message--assistant .chat-diagnostics")).toHaveCount(2, { timeout: 15000 });

  const metrics = await layoutMetrics(page);
  expectNoHorizontalOverflow(metrics);
});

test("medium desktop Ask evidence browser is not cropped", async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 900 });
  await openApp(page);

  await unlockAsk(page);
  await page.locator(".chat-form input").fill("how has the price of steak increased across time by region, break it out by type of steak");
  await page.locator(".chat-form button").click();
  await expect(page.locator(".chat-chart-recommendation")).toBeVisible({ timeout: 15000 });
  await expect(page.locator(".chat-data-browser")).toBeVisible({ timeout: 15000 });

  const metrics = await layoutMetrics(page);
  expectNoHorizontalOverflow(metrics);
  expectBoxWithinViewport(metrics.boxes.filters, metrics.viewport);
  expectBoxWithinViewport(metrics.boxes.canvas, metrics.viewport);
  expectBoxWithinViewport(metrics.boxes.results, metrics.viewport);
  expect(metrics.boxes.detail.x).toBeGreaterThanOrEqual(metrics.boxes.canvas.x - 1);
  expect(metrics.boxes.detail.y).toBeGreaterThan(metrics.boxes.results.y);
  expect(metrics.boxes.chatChartRecommendation.right).toBeLessThanOrEqual(metrics.boxes.canvas.right + 2);
  expect(metrics.boxes.chatDataBrowser.bottom).toBeLessThanOrEqual(metrics.boxes.canvas.bottom + 2);
  expect(metrics.boxes.chatDataBrowser.right).toBeLessThanOrEqual(metrics.boxes.canvas.right + 2);
});

test("tablet presents chart before compact filter and detail panes", async ({ page }) => {
  await page.setViewportSize({ width: 834, height: 1112 });
  await openApp(page);

  const metrics = await layoutMetrics(page);
  expectNoHorizontalOverflow(metrics);
  expect(metrics.boxes.canvas.y).toBeLessThan(metrics.boxes.filters.y);
  expect(metrics.boxes.canvas.y).toBeLessThan(metrics.boxes.detail.y);
  expect(metrics.boxes.filters.right).toBeLessThanOrEqual(metrics.boxes.detail.x + 1);
  expect(metrics.boxes.results.y).toBeGreaterThan(metrics.boxes.filters.y);
  expect(metrics.boxes.viz.height).toBeGreaterThan(340);
  expectNoResultClipping(metrics);
});

test("selected food terms populate the price lens when matching price observations exist", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openApp(page);

  const bacon = page.locator("#ontology-terms button").filter({ hasText: "Bacon" });
  await expect(bacon).toBeVisible();
  await bacon.click();

  await page.locator('.filters .lens-switch button[data-lens="prices"]').click();
  await expect(page.locator("#result-title")).toContainText("Bacon Prices");
  await page.waitForFunction(() => document.querySelectorAll("#viz .price-dot").length > 0);
  await expect(page.locator("#viz")).not.toContainText("No safely indexed prices in this view");
});

test("NYPL source prices populate from structured menu item rows", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openApp(page);

  await page.locator('.filters .source-switch button[data-source="nypl"]').click();
  await page.locator('.filters .lens-switch button[data-lens="prices"]').click();
  await page.waitForFunction(() => document.querySelectorAll("#viz .price-dot").length > 0);
  await expect(page.locator("#viz")).not.toContainText("No safely indexed prices in this view");
});

test("NYPL detail uses NYPL source links, larger images, and item transcriptions", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openApp(page);

  await page.locator('.filters .source-switch button[data-source="nypl"]').click();
  await expect(page.locator(".result-item").first()).toContainText("NYPL");
  await page.locator(".result-item").first().click();

  await expect(page.locator("#detail-card")).toBeVisible();
  await expect(page.locator("#detail-link")).toContainText("Open in NYPL Digital Collections");
  await expect(page.locator("#detail-link")).toHaveAttribute("href", /digitalcollections\.nypl\.org/);
  await expect(page.locator("#detail-image")).toHaveAttribute("src", /images\.nypl\.org.*[?&]t=v/);
  await expect(page.locator("#detail-image-zoom")).toBeVisible();
  await page.locator("#detail-image-zoom").click();
  await expect(page.locator(".image-zoomer")).toBeVisible();
  await expect(page.locator(".image-zoomer img")).toHaveAttribute("src", /images\.nypl\.org.*[?&]t=w/);
  await page.keyboard.press("Escape");
  await expect(page.locator(".image-zoomer")).toHaveCount(0);
  await expect(page.locator("#detail-text")).toContainText("NYPL crowdsourced transcription sample");
  await expect(page.locator("#detail-text")).toContainText("Sample item rows");
});

for (const viewport of [
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 },
]) {
  test(`desktop workstation layout at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await openApp(page);

    const metrics = await layoutMetrics(page);
    expectNoHorizontalOverflow(metrics);
    expectDesktopWorkbenchFitsPage(metrics);
    expect(metrics.boxes.filters.y).toBe(metrics.boxes.canvas.y);
    expect(metrics.boxes.detail.y).toBe(metrics.boxes.canvas.y);
    expect(metrics.boxes.filters.right).toBeLessThan(metrics.boxes.canvas.x);
    expect(metrics.boxes.canvas.right).toBeLessThan(metrics.boxes.detail.x);
    expect(metrics.boxes.results.x).toBeGreaterThanOrEqual(metrics.boxes.canvas.x - 1);
    expect(metrics.boxes.results.y).toBeGreaterThan(metrics.boxes.canvas.y);
    expect(metrics.boxes.viz.height).toBeGreaterThan(350);
    expect(metrics.boxes.canvas.height).toBeLessThan(metrics.viewport.height * 0.8);
    expect(metrics.boxes.detail.bottom).toBeGreaterThan(metrics.boxes.results.bottom);
    expect(metrics.boxes.filters.bottom).toBeGreaterThan(metrics.boxes.results.bottom);
    expectNoResultClipping(metrics);
    expect(metrics.boxes.toolbar.height).toBeLessThanOrEqual(96);
    expect(metrics.boxes.topbar.height).toBeLessThanOrEqual(92);
  });
}
