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

async function openAskEntry(page) {
  await page.goto("/chat/");
  await expect(page.locator("#ask-entry-root")).toBeVisible();
  await expect(page.locator(".ask-entry-root .ask-gate")).toBeVisible();
}

async function unlockAsk(page) {
  const secret = Buffer.from("bWFjZGFkZHk=", "base64").toString("utf8");
  const gate = page.locator(".ask-gate:visible");
  await gate.locator("input").fill(secret);
  await gate.locator("button").click();
  await expect(page.locator(".ask-gate:visible")).toHaveCount(0);
  await expect(page.locator(".chat-form:visible, .ask-entry-composer:visible")).toBeVisible();
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

test("mobile lab hybrid supports mode switching, detail sheets, gated Ask, and evidence-graded dinner builder", async ({ page }) => {
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
  await expect(page.locator(".mobile-inspire .dinner-builder")).toBeVisible();
  await expect(page.locator(".mobile-inspire .dinner-course-card").first()).toContainText(/Source-attested|Recipe-attested|Reconstructed|Evidence gap/);
  await expect(page.locator(".mobile-inspire .dinner-packet-preview")).toContainText("Host Packet");

  metrics = await layoutMetrics(page);
  expectNoHorizontalOverflow(metrics);
});

test("mobile lab variants deep-link to distinct starting modes", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const variants = [
    ["cards", "menus", ".mobile-menu-card"],
    ["journey", "discover", ".mobile-hero"],
    ["chat", "ask", ".mobile-lab-ask .ask-gate"],
    ["recipe", "inspire", ".mobile-inspire .dinner-builder"],
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

test("mobile Ask unlock state keeps prompt suggestions inside the panel", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 640 });
  await openApp(page);
  await expect(page.locator("#result-title")).toContainText("Ask Across");
  await unlockAsk(page);
  await expect(page.locator(".chat-suggestions button").last()).toBeVisible();

  const metrics = await layoutMetrics(page);
  expectNoHorizontalOverflow(metrics);

  const askBounds = await page.evaluate(() => {
    const bounds = (selector) => {
      const el = document.querySelector(selector);
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      return {
        top: Math.round(rect.top),
        bottom: Math.round(rect.bottom),
      };
    };
    const suggestions = document.querySelectorAll(".chat-suggestions button");
    const lastSuggestion = suggestions[suggestions.length - 1]?.getBoundingClientRect();
    return {
      canvas: bounds(".canvas-panel"),
      panel: bounds(".chat-panel"),
      results: bounds(".results-strip"),
      lastSuggestion: lastSuggestion
        ? {
            top: Math.round(lastSuggestion.top),
            bottom: Math.round(lastSuggestion.bottom),
          }
        : null,
    };
  });

  expect(askBounds.lastSuggestion.bottom).toBeLessThanOrEqual(askBounds.canvas.bottom + 2);
  expect(askBounds.panel.bottom).toBeLessThanOrEqual(askBounds.canvas.bottom + 2);
  expect(askBounds.results.top).toBeGreaterThanOrEqual(askBounds.canvas.bottom - 2);
});

test("Ask MenuGraph dedicated entry renders deterministic charts with provenance and local sessions", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openAskEntry(page);
  await unlockAsk(page);
  await expect(page.locator(".ask-entry-composer")).toBeVisible();
  await page.locator(".ask-entry-composer input").fill("compare dinner menus by source over time");
  await page.locator(".ask-entry-composer").evaluate((form) => form.requestSubmit());

  await expect(page.locator(".ask-entry-chart-card")).toBeVisible({ timeout: 15000 });
  await expect(page.locator(".ask-chart-provenance")).toContainText("Data & provenance");
  await expect(page.locator(".ask-chart-provenance")).toContainText("Committed MenuGraph snapshots");
  await expect(page.locator(".ask-entry-evidence-card").first()).toBeVisible();
  await expect(page.locator(".ask-entry-session-rail")).toContainText("This browser only");

  let metrics = await layoutMetrics(page);
  expectNoHorizontalOverflow(metrics);

  await page.reload();
  await expect(page.locator("#ask-entry-root")).toBeVisible();
  await expect(page.locator(".ask-entry-message--user")).toContainText("compare dinner menus by source over time");
  await expect(page.locator(".ask-entry-chart-card")).toBeVisible();
  await page.locator(".ask-entry-actions button").filter({ hasText: "New" }).click();
  await expect(page.locator(".ask-entry-empty")).toBeVisible();
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

test("Ask uses a configured remote Grok endpoint before same-origin fallback", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const chatRequests = [];
  await page.addInitScript(() => {
    window.MenuGraphConfig = { chatApiBase: "https://remote-chat.test" };
  });
  await page.route("**/api/chat", async (route) => {
    const url = route.request().url();
    chatRequests.push(url);
    if (url === "https://remote-chat.test/api/chat") {
      await route.fulfill({
        status: 200,
        contentType: "application/json; charset=utf-8",
        body: JSON.stringify({
          engine: "grok",
          model: "grok-test",
          answer: "Remote Grok answer",
          matches: [],
          facets: {},
          analysis: null,
          chartRecommendation: null,
          caveats: [],
          parsed: null,
          searched: { documents: 0 },
        }),
      });
      return;
    }
    await route.fulfill({
      status: 500,
      contentType: "application/json; charset=utf-8",
      body: JSON.stringify({ error: "same-origin chat should not be called before the configured remote endpoint" }),
    });
  });

  await openApp(page);
  await unlockAsk(page);
  await page.locator(".chat-form input").fill("compare lobster prices in Boston and New York");
  await page.locator(".chat-form button").click();
  await expect(page.locator(".chat-engine")).toContainText("Grok grok-test", { timeout: 15000 });
  await expect(page.locator(".chat-message--assistant .chat-message__body")).toContainText("Remote Grok answer");
  expect(chatRequests[0]).toBe("https://remote-chat.test/api/chat");
  expect(chatRequests).not.toContain("http://127.0.0.1:4173/api/chat");
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

test("ingredient navigator renders CWA visual timeline without relying on public image pixels", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/product-evidence/ingredient-navigator.html");

  await expect(page.locator("#journey-status")).toContainText("Oreo");
  await expect(page.locator("#cwa-timeline-panel")).toBeVisible();
  await expect(page.locator(".source-family-tab")).toHaveCount(3);
  await expect(page.locator(".source-family-tab.is-selected")).toContainText("Official Current Labels");
  await expect(page.locator("#source-family-timeline-title")).toContainText("Official Current Labels");
  await expect(page.locator(".cwa-product-chip")).toHaveCount(84);
  await expect(page.locator(".cwa-timeline-card")).toHaveCount(1);
  await expect(page.locator(".cwa-timeline-card").first()).toContainText("hydrolyzed beef stock");
  await expect(page.locator(".cwa-timeline-card").first().locator(".cwa-ingredient-copy.is-compact")).toBeVisible();
  const defaultProofCard = await page.locator(".cwa-timeline-card").first().boundingBox();
  expect(defaultProofCard?.width || 0).toBeGreaterThan(900);
  await expect(page.locator(".cwa-timeline-card").first().locator(".cwa-action-icon[aria-label^='Open source']")).toBeVisible();
  await expect(page.locator(".cwa-timeline-card").first().locator(".cwa-action-icon[aria-label='Open local private crop']")).toBeVisible();
  await expect(page.locator(".cwa-timeline-card").first().locator(".cwa-action-icon[aria-label='Open ingredient drill-in']")).toBeVisible();
  await expect(page.locator(".cwa-timeline-card .status-badge")).toHaveCount(0);
  expect(await page.locator(".cwa-status-icon").count()).toBeGreaterThan(0);
  await page.locator(".cwa-timeline-card").first().locator(".cwa-preview-frame").click();
  await expect(page.locator(".cwa-timeline-card").first()).toHaveClass(/is-ingredient-open/);
  await expect(page.locator(".cwa-timeline-card").first().locator(".cwa-ingredient-overlay")).toContainText("Beef");

  await page.locator(".source-family-tab").filter({ hasText: "Candy Wrapper Archive" }).click();
  await expect(page.locator(".source-family-tab.is-selected")).toContainText("Candy Wrapper Archive");
  await expect(page.locator(".cwa-product-chip")).toHaveCount(5);
  await expect(page.locator(".cwa-timeline-card")).toHaveCount(4);
  await expect(page.locator(".cwa-timeline-card").first()).toContainText(/readable ingredient panel still needed/i);
  await expect(page.locator(".cwa-timeline-card").nth(1)).toContainText("Milk chocolate, peanuts");
  await expect(page.locator(".cwa-timeline-card .status-badge")).toHaveCount(0);
  expect(await page.locator(".cwa-status-icon").count()).toBeGreaterThan(0);
  await expect(page.locator(".cwa-timeline-card").first().locator(".cwa-action-icon[aria-label^='Open source']")).toBeVisible();
  await expect(page.locator(".cwa-timeline-card").first().locator(".cwa-action-icon[aria-label='Open local private crop']")).toBeVisible();
  await expect(page.locator(".cwa-timeline-card").first().locator(".cwa-action-icon[aria-label='Open ingredient drill-in']")).toBeVisible();
  await expect(page.locator(".cwa-timeline-card").first().locator(".cwa-card-links")).not.toContainText(/Local crop|Inspect|candywrapperarchive/i);
  await expect(page.locator(".cwa-timeline-card a").first()).toHaveAttribute("href", /candywrapperarchive\.com/);
  await expect(page.locator(".cwa-timeline-card").nth(1)).toHaveCSS("transform", "none");

  await page.locator(".cwa-timeline-card").nth(1).locator(".cwa-preview-frame").click();
  await expect(page.locator(".cwa-timeline-card").nth(1)).toHaveClass(/is-ingredient-open/);
  await expect(page.locator(".cwa-timeline-card").nth(1).locator(".cwa-ingredient-overlay")).toContainText("Milk chocolate");
  expect(await page.locator(".cwa-timeline-card").nth(1).locator(".cwa-overlay-ingredient-list li").count()).toBeGreaterThan(3);

  await page.locator(".cwa-product-chip").filter({ hasText: "Tootsie Roll" }).click();
  await expect(page.locator(".cwa-timeline-card")).toHaveCount(3);
  await expect(page.locator(".cwa-timeline-card").filter({ hasText: "Tootsie Roll" })).toHaveCount(3);
  await expect(page.locator(".cwa-timeline-card").first()).toContainText("corn syrup");
  expect(await page.locator(".cwa-preview-frame").count()).toBe(3);
  expect(await page.locator(".cwa-preview-frame img, .cwa-preview-placeholder").count()).toBeGreaterThanOrEqual(3);

  await page.locator(".source-family-tab").filter({ hasText: "Flickr Package Archive" }).click();
  await expect(page.locator(".source-family-tab.is-selected")).toContainText("Flickr Package Archive");
  await expect(page.locator("#source-family-timeline-title")).toContainText("Flickr Package Archive");
  await expect(page.locator(".cwa-product-chip")).toHaveCount(12);
  await expect(page.locator(".cwa-timeline-card").first()).toContainText(/ingredients|beverage syrup|label formula|carbonated water/i);
  await page.locator(".cwa-product-chip").filter({ hasText: "Cheerios Original" }).click();
  await expect(page.locator(".cwa-timeline-card")).toHaveCount(1);
  await expect(page.locator(".cwa-timeline-card").first()).toContainText("whole grain oats");
  await expect(page.locator(".cwa-timeline-card").first()).toContainText("trisodium phosphate");
  await expect(page.locator(".cwa-timeline-card").first().locator(".cwa-status-icon[aria-label^='Ingredient text candidate']")).toBeVisible();
  await page.locator(".cwa-product-chip").filter({ hasText: "Trix Cereal" }).click();
  await expect(page.locator(".cwa-timeline-card")).toHaveCount(2);
  await expect(page.locator(".cwa-timeline-card").first()).toContainText(/promotion\/top-flap panel only|readable ingredient panel still needed/i);
  await expect(page.locator(".cwa-timeline-card").first().locator(".cwa-status-icon[aria-label^='Visual lineage only']")).toBeVisible();
  await expect(page.locator(".cwa-timeline-card").first().locator(".cwa-status-icon[aria-label='Local private upscaled crop available']")).toBeVisible();
  await page.locator(".cwa-product-chip").filter({ hasText: "Kellogg's Froot Loops" }).click();
  await expect(page.locator(".cwa-timeline-card")).toHaveCount(2);
  await expect(page.locator(".cwa-timeline-card").first()).toContainText("partially hydrogenated vegetable oil");
  await expect(page.locator(".cwa-timeline-card").first().locator(".cwa-ingredient-copy li").first()).toContainText("sugar");
  await page.locator(".cwa-timeline-card").first().locator(".cwa-preview-frame").click();
  await expect(page.locator(".cwa-timeline-card").first().locator(".cwa-ingredient-overlay")).toContainText("artificial coloring");
  await expect(page.locator(".cwa-timeline-card").first().locator(".cwa-ingredient-overlay")).toContainText("Ingredients on label");
  await page.locator(".cwa-timeline-card").first().locator("[data-cwa-inspect]").click();
  await expect(page.locator("#ingredient-drilldown")).toBeVisible();
  await expect(page.locator("#ingredient-drilldown-title")).toContainText("Kellogg's Froot Loops");
  await expect(page.locator("#ingredient-drilldown")).toContainText("partially hydrogenated vegetable oil");
  await expect(page.locator("#ingredient-drilldown")).toContainText("Claim Boundary");
  await expect(page.locator("#ingredient-drilldown .ingredient-drilldown-image img, #ingredient-drilldown .ingredient-drilldown-placeholder")).toBeVisible();
  await page.locator(".ingredient-drilldown-close").click();
  await expect(page.locator("#ingredient-drilldown")).toBeHidden();

  await page.locator(".source-family-tab").filter({ hasText: "Official Current Labels" }).click();
  await expect(page.locator(".source-family-tab.is-selected")).toContainText("Official Current Labels");
  await expect(page.locator(".cwa-product-chip")).toHaveCount(84);
  await page.locator(".cwa-product-chip").filter({ hasText: "Oreo Original Chocolate Sandwich Cookies" }).click();
  await expect(page.locator(".cwa-timeline-card")).toHaveCount(1);
  await expect(page.locator(".cwa-timeline-card").first()).toContainText("HIGH FRUCTOSE CORN SYRUP");
  await expect(page.locator(".cwa-timeline-card").first().locator(".cwa-status-icon[aria-label^='Ingredient text candidate']")).toBeVisible();
  await expect(page.locator(".cwa-timeline-card").first().locator(".cwa-status-icon[aria-label='Local private upscaled crop available']")).toBeVisible();
  await page.locator(".cwa-product-chip").filter({ hasText: "Cheetos Crunchy" }).click();
  await expect(page.locator(".cwa-timeline-card")).toHaveCount(1);
  await expect(page.locator(".cwa-timeline-card").first()).toContainText("Enriched Corn Meal");
  await page.locator(".cwa-product-chip").filter({ hasText: "Pepsi Cola" }).click();
  await expect(page.locator(".cwa-timeline-card")).toHaveCount(1);
  await expect(page.locator(".cwa-timeline-card").first()).toContainText("Phosphoric Acid");
  await page.locator(".cwa-product-chip").filter({ hasText: "Coca-Cola Classic" }).click();
  await expect(page.locator(".cwa-timeline-card")).toHaveCount(1);
  await expect(page.locator(".cwa-timeline-card").first()).toContainText("CARBONATED WATER");
  await page.locator(".cwa-product-chip").filter({ hasText: "Sprite Original" }).click();
  await expect(page.locator(".cwa-timeline-card")).toHaveCount(1);
  await expect(page.locator(".cwa-timeline-card").first()).toContainText("HIGH FRUCTOSE CORN SYRUP");
  await page.locator(".cwa-product-chip").filter({ hasText: "Heinz Tomato Ketchup" }).click();
  await expect(page.locator(".cwa-timeline-card")).toHaveCount(1);
  await expect(page.locator(".cwa-timeline-card").first()).toContainText("TOMATO CONCENTRATE");
  await page.locator(".cwa-product-chip").filter({ hasText: "Kraft Macaroni & Cheese Original" }).click();
  await expect(page.locator(".cwa-timeline-card")).toHaveCount(1);
  await expect(page.locator(".cwa-timeline-card").first()).toContainText("CHEESE SAUCE MIX");
  await page.locator(".cwa-product-chip").filter({ hasText: "Velveeta Shells & Cheese" }).click();
  await expect(page.locator(".cwa-timeline-card")).toHaveCount(1);
  await expect(page.locator(".cwa-timeline-card").first()).toContainText("SODIUM ALGINATE");
  await page.locator(".cwa-product-chip").filter({ hasText: "Totino's Pizza Rolls" }).click();
  await expect(page.locator(".cwa-timeline-card")).toHaveCount(1);
  await expect(page.locator(".cwa-timeline-card").first()).toContainText("Tomato Puree");
  await page.locator(".cwa-product-chip").filter({ hasText: "Wendy's Dave's Single" }).click();
  await expect(page.locator(".cwa-timeline-card")).toHaveCount(1);
  await expect(page.locator(".cwa-timeline-card").first()).toContainText("Potato Bun");
  await expect(page.locator(".cwa-timeline-card").first()).toContainText("Ground Beef");
  await page.locator(".cwa-product-chip").filter({ hasText: "Wendy's Chili" }).click();
  await expect(page.locator(".cwa-timeline-card")).toHaveCount(1);
  await expect(page.locator(".cwa-timeline-card").first()).toContainText("Chili Beans");
  await page.locator(".cwa-product-chip").filter({ hasText: "Cheerios Original" }).click();
  await expect(page.locator(".cwa-timeline-card")).toHaveCount(1);
  await expect(page.locator(".cwa-timeline-card").first()).toContainText("Whole Grain Oats");
  await page.locator(".cwa-product-chip").filter({ hasText: "Cinnamon Toast Crunch" }).click();
  await expect(page.locator(".cwa-timeline-card")).toHaveCount(1);
  await expect(page.locator(".cwa-timeline-card").first()).toContainText("Trisodium Phosphate");
  await page.locator(".cwa-product-chip").filter({ hasText: "Hidden Valley Original Ranch" }).click();
  await expect(page.locator(".cwa-timeline-card")).toHaveCount(1);
  await expect(page.locator(".cwa-timeline-card").first()).toContainText("Monosodium Glutamate");
  await page.locator(".cwa-product-chip").filter({ hasText: "Butterfinger Bar" }).click();
  await expect(page.locator(".cwa-timeline-card")).toHaveCount(1);
  await expect(page.locator(".cwa-timeline-card").first()).toContainText("peanut flour");
  await page.locator(".cwa-product-chip").filter({ hasText: "Pop-Tarts Frosted Strawberry" }).click();
  await expect(page.locator(".cwa-timeline-card")).toHaveCount(1);
  await expect(page.locator(".cwa-timeline-card").first()).toContainText("dried strawberries");
  await page.locator(".cwa-product-chip").filter({ hasText: "Campbell's Condensed Tomato Soup" }).click();
  await expect(page.locator(".cwa-timeline-card")).toHaveCount(1);
  await expect(page.locator(".cwa-timeline-card").first()).toContainText("Tomato Puree");
  await page.locator(".cwa-product-chip").filter({ hasText: "Philadelphia Original Cream Cheese" }).click();
  await expect(page.locator(".cwa-timeline-card")).toHaveCount(1);
  await expect(page.locator(".cwa-timeline-card").first()).toContainText("PASTEURIZED MILK AND CREAM");
  await page.locator(".cwa-product-chip").filter({ hasText: "Kool-Aid Cherry Drink Mix" }).click();
  await expect(page.locator(".cwa-timeline-card")).toHaveCount(1);
  await expect(page.locator(".cwa-timeline-card").first()).toContainText("CITRIC ACID");
  await page.locator(".cwa-product-chip").filter({ hasText: "Pringles Original Crisps" }).click();
  await expect(page.locator(".cwa-timeline-card")).toHaveCount(1);
  await expect(page.locator(".cwa-timeline-card").first()).toContainText("DRIED POTATOES");
  await page.locator(".cwa-product-chip").filter({ hasText: "Chick-fil-A Chicken Sandwich" }).click();
  await expect(page.locator(".cwa-timeline-card")).toHaveCount(1);
  await expect(page.locator(".cwa-timeline-card").first()).toContainText("monosodium glutamate");
  await page.locator(".cwa-product-chip").filter({ hasText: "M&M's Milk Chocolate Candies" }).click();
  await expect(page.locator(".cwa-timeline-card")).toHaveCount(1);
  await expect(page.locator(".cwa-timeline-card").first()).toContainText("carnauba wax");
  await page.locator(".cwa-product-chip").filter({ hasText: "Kit Kat Bar" }).click();
  await expect(page.locator(".cwa-timeline-card")).toHaveCount(1);
  await expect(page.locator(".cwa-timeline-card").first()).toContainText("Wheat Flour");
  await page.locator(".cwa-product-chip").filter({ hasText: "Tostitos Original Restaurant Style" }).click();
  await expect(page.locator(".cwa-timeline-card")).toHaveCount(1);
  await expect(page.locator(".cwa-timeline-card").first()).toContainText("Corn Oil");
  await page.locator(".cwa-product-chip").filter({ hasText: "Triscuit Original Crackers" }).click();
  await expect(page.locator(".cwa-timeline-card")).toHaveCount(1);
  await expect(page.locator(".cwa-timeline-card").first()).toContainText("WHOLE GRAIN WHEAT");
  await page.locator(".cwa-product-chip").filter({ hasText: "Doritos Nacho Cheese" }).click();
  await expect(page.locator(".cwa-timeline-card")).toHaveCount(1);
  await expect(page.locator(".cwa-timeline-card").first()).toContainText("Monosodium Glutamate");
  await page.locator(".cwa-product-chip").filter({ hasText: "Kellogg's Rice Krispies" }).click();
  await expect(page.locator(".cwa-timeline-card")).toHaveCount(1);
  await expect(page.locator(".cwa-timeline-card").first()).toContainText("malt flavor");
  await page.locator(".cwa-product-chip").filter({ hasText: "Bisquick Original Pancake and Baking Mix" }).click();
  await expect(page.locator(".cwa-timeline-card")).toHaveCount(1);
  await expect(page.locator(".cwa-timeline-card").first()).toContainText("Monoglycerides");
  await page.locator(".cwa-product-chip").filter({ hasText: "Stouffer's Lasagna with Meat & Sauce" }).click();
  await expect(page.locator(".cwa-timeline-card")).toHaveCount(1);
  await expect(page.locator(".cwa-timeline-card").first()).toContainText("TOMATO PUREE");
  await page.locator(".cwa-product-chip").filter({ hasText: "Skittles Original" }).click();
  await expect(page.locator(".cwa-timeline-card")).toHaveCount(1);
  await expect(page.locator(".cwa-timeline-card").first()).toContainText("Carnauba Wax");
  await page.locator(".cwa-product-chip").filter({ hasText: "Starburst Original" }).click();
  await expect(page.locator(".cwa-timeline-card")).toHaveCount(1);
  await expect(page.locator(".cwa-timeline-card").first()).toContainText("Apple Juice From Concentrate");
  await page.locator(".cwa-product-chip").filter({ hasText: "Milky Way Bar" }).click();
  await expect(page.locator(".cwa-timeline-card")).toHaveCount(1);
  await expect(page.locator(".cwa-timeline-card").first()).toContainText("Barley Malt Extract");
  await page.locator(".cwa-product-chip").filter({ hasText: "SpaghettiOs Original" }).click();
  await expect(page.locator(".cwa-timeline-card")).toHaveCount(1);
  await expect(page.locator(".cwa-timeline-card").first()).toContainText("HIGH FRUCTOSE CORN SYRUP");
  await page.locator(".cwa-product-chip").filter({ hasText: "Oscar Mayer Wieners" }).click();
  await expect(page.locator(".cwa-timeline-card")).toHaveCount(1);
  await expect(page.locator(".cwa-timeline-card").first()).toContainText("SODIUM NITRITE");
  await page.locator(".cwa-product-chip").filter({ hasText: "Smucker's Strawberry Preserves" }).click();
  await expect(page.locator(".cwa-timeline-card")).toHaveCount(1);
  await expect(page.locator(".cwa-timeline-card").first()).toContainText("High Fructose Corn Syrup");
  await page.locator(".cwa-product-chip").filter({ hasText: "Panera Broccoli Cheddar Soup" }).click();
  await expect(page.locator(".cwa-timeline-card")).toHaveCount(1);
  await expect(page.locator(".cwa-timeline-card").first()).toContainText("Dijon Mustard");
  await page.locator(".cwa-product-chip").filter({ hasText: "Twix Bar" }).click();
  await expect(page.locator(".cwa-timeline-card")).toHaveCount(1);
  await expect(page.locator(".cwa-timeline-card").first()).toContainText("Enriched Wheat Flour");
  await page.locator(".cwa-product-chip").filter({ hasText: "Wheaties" }).click();
  await expect(page.locator(".cwa-timeline-card")).toHaveCount(1);
  await expect(page.locator(".cwa-timeline-card").first()).toContainText("Whole Grain Wheat");
  await page.locator(".cwa-product-chip").filter({ hasText: "Ball Park Franks" }).click();
  await expect(page.locator(".cwa-timeline-card")).toHaveCount(1);
  await expect(page.locator(".cwa-timeline-card").first()).toContainText("hydrolyzed beef stock");
  await page.locator(".cwa-product-chip").filter({ hasText: "French's Classic Yellow Mustard" }).click();
  await expect(page.locator(".cwa-timeline-card")).toHaveCount(1);
  await expect(page.locator(".cwa-timeline-card").first()).toContainText("#1 Grade Mustard Seed");
  await page.locator(".cwa-product-chip").filter({ hasText: "Pepperidge Farm Goldfish Cheddar" }).click();
  await expect(page.locator(".cwa-timeline-card")).toHaveCount(1);
  await expect(page.locator(".cwa-timeline-card").first()).toContainText("Autolyzed Yeast Extract");
  await page.locator(".cwa-product-chip").filter({ hasText: "Hamburger Helper Cheeseburger Macaroni" }).click();
  await expect(page.locator(".cwa-timeline-card")).toHaveCount(1);
  await expect(page.locator(".cwa-timeline-card").first()).toContainText("Enriched Pasta");
  await page.locator(".cwa-product-chip").filter({ hasText: "Post Grape-Nuts" }).click();
  await expect(page.locator(".cwa-timeline-card")).toHaveCount(1);
  await expect(page.locator(".cwa-timeline-card").first()).toContainText("Whole Grain Wheat Flour");
  await page.locator(".cwa-product-chip").filter({ hasText: "McDonald's Big Mac" }).click();
  await expect(page.locator(".cwa-timeline-card")).toHaveCount(1);
  await expect(page.locator(".cwa-timeline-card").first()).toContainText("Big Mac Sauce");
  await page.locator(".cwa-product-chip").filter({ hasText: "McDonald's World Famous Fries" }).click();
  await expect(page.locator(".cwa-timeline-card")).toHaveCount(1);
  await expect(page.locator(".cwa-timeline-card").first()).toContainText("Natural Beef Flavor");
  await page.locator(".cwa-product-chip").filter({ hasText: "McDonald's Chicken McNuggets" }).click();
  await expect(page.locator(".cwa-timeline-card")).toHaveCount(1);
  await expect(page.locator(".cwa-timeline-card").first()).toContainText("White Boneless Chicken");

  const response = await page.request.get("/api/private/ingredient-crops/unknown_visual_id_000000");
  expect(response.status()).toBe(404);
  const traversal = await page.request.get("/api/private/ingredient-crops/..%2Fbad");
  expect(traversal.status()).toBe(404);

  const metrics = await page.evaluate(() => ({
    viewport: { width: window.innerWidth, height: window.innerHeight },
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expectNoHorizontalOverflow(metrics);
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
