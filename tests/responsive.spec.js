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
  await expect(page.locator(".status-badge")).toHaveCount(0);
  expect(await page.locator(".status-icon").count()).toBeGreaterThan(0);
  await expect(page.locator(".readiness-pair .status-icon").first()).toHaveAttribute("aria-label", /Story Ready|Confirmed Story Ready/);
  await expect(page.locator(".source-family-tab")).toHaveCount(6);
  await expect(page.locator(".source-family-tab.is-selected")).toContainText("All Proof Products");
  await expect(page.locator(".source-family-tab.is-selected")).not.toContainText(/products · \d+ proof/);
  await expect(page.locator(".source-family-tab.is-selected .source-family-tab-metric[aria-label='120 products']")).toBeVisible();
  await expect(page.locator(".source-family-tab.is-selected .source-family-tab-metric[aria-label='149 ingredient proof rows']")).toBeVisible();
  await expect(page.locator(".source-family-tab.is-selected .source-family-tab-metric[aria-label='152 local visual previews']")).toBeVisible();
  await expect(page.locator(".source-family-tab.is-selected .source-family-tab-metric[aria-label='11 readable panels still needed']")).toBeVisible();
  await expect(page.locator("#source-family-timeline-title")).toContainText("All Proof Products");
  await expect(page.locator("#source-family-timeline-note")).not.toContainText(/products · \d+ source-backed proof cards/);
  await expect(page.locator("#source-family-timeline-note .source-family-header-metric[aria-label='120 products']")).toBeVisible();
  await expect(page.locator("#source-family-timeline-note .source-family-header-metric[aria-label='149 ingredient proof rows']")).toBeVisible();
  await expect(page.locator("#source-family-timeline-note .source-family-header-metric[aria-label='152 local visual previews']")).toBeVisible();
  await expect(page.locator("#source-family-timeline-note .source-family-header-metric[aria-label='11 readable panels still needed']")).toBeVisible();
  const sourceFamilySummary = page.locator("#source-family-summary");
  await expect(sourceFamilySummary).toContainText("152");
  await expect(sourceFamilySummary).toContainText("local visuals");
  await expect(sourceFamilySummary).toContainText("149");
  await expect(sourceFamilySummary).toContainText("ingredient lists");
  await expect(sourceFamilySummary.locator(".source-family-focus")).not.toContainText(/products · \d+ proof rows|local visuals · \d+ structured ingredient rows/);
  await expect(sourceFamilySummary.locator(".source-family-focus")).toContainText("All Proof Products");
  await expect(sourceFamilySummary.locator(".source-family-focus-metric[aria-label='120 products']")).toBeVisible();
  await expect(sourceFamilySummary.locator(".source-family-focus-metric[aria-label='160 proof rows']")).toBeVisible();
  await expect(sourceFamilySummary.locator(".source-family-focus-metric[aria-label='149 proof text candidates']")).toBeVisible();
  await expect(sourceFamilySummary.locator(".source-family-focus-metric[aria-label='152 local visuals']")).toBeVisible();
  await expect(sourceFamilySummary.locator(".source-family-focus-metric[aria-label='149 structured ingredient rows']")).toBeVisible();
  await expect(sourceFamilySummary.locator(".source-family-focus-metric[aria-label='11 readable panel gaps']")).toBeVisible();
  await expect(page.locator(".cwa-product-chip")).toHaveCount(120);
  await expect(page.locator("#source-family-gap-summary")).toContainText("Readable panel queue");
  await expect(page.locator("#source-family-gap-summary")).toContainText("11 rows");
  await expect(page.locator("#source-family-gap-summary .source-family-gap-card")).toHaveCount(11);
  await expect(page.locator("#source-family-gap-summary")).toContainText("Candy Wrapper Archive");
  await expect(page.locator("#source-family-gap-summary")).toContainText("Flickr Package Archive");
  await expect(page.locator("#source-family-gap-summary")).toContainText("Collection Targets");
  await expect(page.locator("#source-family-gap-summary")).toContainText("Kit Kat Bar");
  await expect(page.locator("#source-family-gap-summary")).toContainText("Trix Cereal");
  await expect(page.locator("#source-family-gap-summary")).toContainText("Starbucks Pumpkin Spice Latte");
  await expect(page.locator("#source-family-gap-summary")).toContainText("KFC Original Recipe Chicken");
  await expect(page.locator("#source-family-gap-summary")).toContainText("Readable Panel Photo Needed");
  await expect(page.locator("#source-family-gap-summary")).toContainText("Panel Capture Needed");
  await expect(page.locator("#source-family-gap-summary")).toContainText("Document Text Pipeline Needed");
  await expect(page.locator("#source-family-gap-summary .source-family-gap-kind")).toHaveCount(11);
  await expect(page.locator("#source-family-gap-summary .source-family-gap-copy em")).toHaveCount(0);
  await expect(page.locator("#source-family-gap-summary")).toContainText("Find a same-era Kit Kat Bar back or side wrapper image");
  await expect(page.locator("#source-family-gap-summary")).toContainText("Capture a Starbucks-owned menu");
  await expect(page.locator("#source-family-gap-summary")).toContainText("Resolve KFC US nutrition/allergen data");
  await expect(page.locator("#source-family-gap-summary")).toContainText("Accepted proof");
  await expect(page.locator("#source-family-gap-summary")).toContainText("Do not use");
  await expect(page.locator("#source-family-gap-summary")).toContainText("same-era back or side wrapper photo");
  await expect(page.locator("#source-family-gap-summary")).toContainText("front-only wrapper art");
  await expect(page.locator("#source-family-gap-summary")).toContainText("same-package ingredient panel crop");
  await expect(page.locator("#source-family-gap-summary")).toContainText("promotion or top-flap copy only");
  await expect(page.locator("#source-family-gap-summary")).toContainText("Starbucks-owned menu or product API");
  await expect(page.locator("#source-family-gap-summary")).toContainText("secondary nutrition articles or recipes");
  await expect(page.locator("#source-family-gap-summary")).toContainText("KFC-owned US nutrition/allergen/ingredient document");
  await expect(page.locator("#source-family-gap-summary")).toContainText("secret-recipe articles or recreation recipes");
  await expect(page.locator("#source-family-coverage-summary")).toContainText("Full-corpus capture queue");
  await expect(page.locator("#source-family-coverage-summary")).toContainText("120/120 timeline products");
  await expect(page.locator("#source-family-coverage-summary")).toContainText("118 proof-visual products");
  await expect(page.locator("#source-family-coverage-summary")).toContainText("2 collection targets");
  await expect(page.locator("#source-family-coverage-summary")).toContainText("Starbucks Pumpkin Spice Latte");
  await expect(page.locator("#source-family-coverage-summary")).toContainText("KFC Original Recipe Chicken");
  await expect(page.locator("#source-family-coverage-summary")).toContainText("Official Starbucks source cache blocked");
  await expect(page.locator("#source-family-coverage-summary")).toContainText("Item-level ingredient source needed");

  await page.locator(".source-family-tab").filter({ hasText: "Official Current Labels" }).click();
  await expect(page.locator(".source-family-tab.is-selected")).toContainText("Official Current Labels");
  await expect(page.locator(".source-family-tab.is-selected .source-family-tab-metric[aria-label='105 products']")).toBeVisible();
  await expect(page.locator(".source-family-tab.is-selected .source-family-tab-metric[aria-label='105 ingredient proof rows']")).toBeVisible();
  await expect(page.locator(".source-family-tab.is-selected .source-family-tab-metric[aria-label='105 local visual previews']")).toBeVisible();
  await expect(page.locator("#source-family-timeline-title")).toContainText("Official Current Labels");
  await expect(page.locator("#source-family-timeline-note .source-family-header-metric[aria-label='105 products']")).toBeVisible();
  await expect(page.locator("#source-family-timeline-note .source-family-header-metric[aria-label='105 ingredient proof rows']")).toBeVisible();
  await expect(page.locator("#source-family-timeline-note .source-family-header-metric[aria-label='105 local visual previews']")).toBeVisible();
  await expect(sourceFamilySummary.locator(".source-family-focus")).not.toContainText(/products · \d+ proof rows|local visuals · \d+ structured ingredient rows/);
  await expect(sourceFamilySummary.locator(".source-family-focus-metric[aria-label='105 products']")).toBeVisible();
  await expect(sourceFamilySummary.locator(".source-family-focus-metric[aria-label='105 proof rows']")).toBeVisible();
  await expect(sourceFamilySummary.locator(".source-family-focus-metric[aria-label='105 proof text candidates']")).toBeVisible();
  await expect(sourceFamilySummary.locator(".source-family-focus-metric[aria-label='105 local visuals']")).toBeVisible();
  await expect(sourceFamilySummary.locator(".source-family-focus-metric[aria-label='105 structured ingredient rows']")).toBeVisible();
  await expect(sourceFamilySummary.locator(".source-family-focus-metric[aria-label='0 readable panel gaps']")).toHaveCount(0);
  await expect(page.locator(".cwa-product-chip")).toHaveCount(105);
  await expect(page.locator("#source-family-gap-summary")).toBeHidden();
  await expect(page.locator(".cwa-product-chip").first().locator(".cwa-product-thumb.has-proof")).toBeVisible();
  await expect(page.locator(".cwa-product-chip").first().locator(".cwa-product-thumb img")).toBeVisible();
  await expect(page.locator(".cwa-product-chip").first()).not.toContainText(/rows · \d+ proof · \d+ local/);
  await expect(page.locator(".cwa-product-chip").first().locator(".cwa-product-chip-metrics")).toBeVisible();
  await expect(page.locator(".cwa-product-chip").first().locator(".cwa-product-chip-metric[aria-label='1 visual row']")).toBeVisible();
  await expect(page.locator(".cwa-product-chip").first().locator(".cwa-product-chip-metric[aria-label='1 ingredient proof row']")).toBeVisible();
  await expect(page.locator(".cwa-product-chip").first().locator(".cwa-product-chip-metric[aria-label='1 local visual preview']")).toBeVisible();
  await expect(page.locator(".cwa-timeline-card")).toHaveCount(1);
  await expect(page.locator(".cwa-timeline-card").first()).toContainText("hydrolyzed beef stock");
  await expect(page.locator(".cwa-timeline-card").first()).toHaveAttribute("data-proof-basis", "official_source_text_proof_panel");
  await expect(page.locator(".cwa-timeline-card").first().locator(".cwa-ingredient-copy.is-compact")).toBeVisible();
  await expect(page.locator(".cwa-timeline-card").first().locator(".cwa-label-reader")).toBeVisible();
  await expect(page.locator(".cwa-timeline-card").first().locator(".cwa-label-reader-title")).toContainText("Label reader");
  await expect(page.locator(".cwa-timeline-card").first().locator(".cwa-label-reader-meta")).toContainText(/ingredient entr/);
  await expect(page.locator(".cwa-timeline-card").first().locator(".cwa-ingredient-copy.is-compact ul li").first()).toBeVisible();
  await expect(page.locator(".cwa-timeline-card").first().locator(".cwa-ingredient-source-line")).toBeVisible();
  const defaultTranscript = page.locator(".cwa-timeline-card").first().locator(".cwa-ingredient-transcript");
  await expect(defaultTranscript.locator("summary")).toContainText("Full ingredient transcript");
  await expect(defaultTranscript).not.toHaveAttribute("open", "");
  const defaultProofCard = await page.locator(".cwa-timeline-card").first().boundingBox();
  expect(defaultProofCard?.width || 0).toBeGreaterThan(900);
  await expect(page.locator(".cwa-timeline-card").first()).toHaveCSS("transform", "none");
  await expect(page.locator(".cwa-timeline-card").first().locator(".cwa-preview-frame img")).toHaveCSS("transform", "none");
  await expect(page.locator(".cwa-timeline-card").first().locator(".cwa-preview-lens")).toBeVisible();
  await expect(page.locator(".cwa-timeline-card").first().locator(".cwa-action-icon[aria-label^='Open source']")).toBeVisible();
  await expect(page.locator(".cwa-timeline-card").first().locator(".cwa-action-icon[aria-label='Open local private crop']")).toBeVisible();
  await expect(page.locator(".cwa-timeline-card").first().locator(".cwa-action-icon[aria-label='Open ingredient drill-in']")).toBeVisible();
  await expect(page.locator(".cwa-timeline-card").first().locator(".cwa-card-body")).toHaveAttribute("data-cwa-body-inspect", /./);
  await expect(page.locator(".cwa-timeline-card").first().locator(".cwa-card-body")).toHaveAttribute("role", "button");
  await expect(page.locator(".cwa-timeline-card").first().locator(".cwa-card-body")).toHaveAttribute("tabindex", "0");
  await expect(page.locator(".cwa-timeline-card").first().locator(".cwa-card-body")).toHaveAttribute("aria-label", /Open ingredient drill-in/);
  await expect(page.locator(".cwa-timeline-card").first().locator(".cwa-body-inspect-hint")).toBeVisible();
  const firstProofProductName = await page.locator(".cwa-timeline-card").first().locator(".cwa-card-body > strong").innerText();
  await page.locator(".cwa-timeline-card").first().locator(".cwa-card-body").focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("#ingredient-drilldown")).toBeVisible();
  await expect(page.locator("#ingredient-drilldown-title")).toContainText(firstProofProductName);
  await page.keyboard.press("Escape");
  await expect(page.locator("#ingredient-drilldown")).toBeHidden();
  await page.locator(".cwa-timeline-card").first().locator(".cwa-card-body > strong").click();
  await expect(page.locator("#ingredient-drilldown")).toBeVisible();
  await expect(page.locator("#ingredient-drilldown-title")).toContainText(firstProofProductName);
  await page.keyboard.press("Escape");
  await expect(page.locator("#ingredient-drilldown")).toBeHidden();
  await page.mouse.move(8, 8);
  await expect(page.locator(".cwa-timeline-card .status-badge")).toHaveCount(0);
  expect(await page.locator(".cwa-status-icon").count()).toBeGreaterThan(0);
  const firstProofCard = page.locator(".cwa-timeline-card").first();
  const firstProofPreview = firstProofCard.locator(".cwa-preview-frame");
  const firstProofOverlay = firstProofCard.locator(".cwa-ingredient-overlay");
  await expect(firstProofPreview).toHaveAttribute("aria-label", /Show ingredient proof text/);
  await expect(firstProofPreview).toHaveAttribute("aria-describedby", /cwa-label-reader-/);
  const firstReaderId = await firstProofCard.locator(".cwa-label-reader").getAttribute("id");
  await expect(firstProofPreview).toHaveAttribute("aria-describedby", firstReaderId || "");
  await expect(firstProofOverlay).toHaveCSS("opacity", "0");
  await firstProofPreview.hover();
  await expect(firstProofCard).toHaveClass(/is-ingredient-preview/);
  await expect(firstProofOverlay).toHaveCSS("opacity", "1");
  await expect(firstProofOverlay).toContainText("Ingredients");
  await expect(firstProofOverlay).toContainText("Beef");
  const firstProofOverlayMeta = firstProofOverlay.locator(".cwa-overlay-proof-meta");
  await expect(firstProofOverlayMeta).toContainText("current_2020s");
  await expect(firstProofOverlayMeta).toContainText("www.tysonfoodservice.com");
  await expect(firstProofOverlayMeta).toContainText("Source text proof panel");
  const firstProofHighlightOpacity = await firstProofPreview.evaluate((element) => getComputedStyle(element, "::before").opacity);
  expect(Number(firstProofHighlightOpacity)).toBeGreaterThan(0);
  const firstProofGuideOpacity = await firstProofPreview.locator(".cwa-preview-reader-guide").evaluate((element) => getComputedStyle(element).opacity);
  expect(Number(firstProofGuideOpacity)).toBeGreaterThan(0);
  await expect(firstProofOverlay).toHaveClass(/has-ingredient-list/);
  await expect(firstProofOverlay).toHaveCSS("bottom", "12px");
  expect((await firstProofOverlay.boundingBox())?.width || 0).toBeGreaterThan(300);
  await page.mouse.move(8, 8);
  await expect(firstProofCard).not.toHaveClass(/is-ingredient-preview/);
  await firstProofPreview.click();
  await expect(firstProofCard).toHaveClass(/is-ingredient-open/);
  await expect(firstProofPreview).toHaveAttribute("aria-pressed", "true");
  await expect(firstProofPreview).toHaveAttribute("aria-label", /Hide ingredient proof text/);
  await expect(firstProofOverlay).toHaveCSS("opacity", "1");
  await defaultTranscript.locator("summary").click();
  await expect(defaultTranscript).toHaveAttribute("open", "");
  await expect(defaultTranscript.locator("p")).toContainText("hydrolyzed beef stock");

  await page.locator(".source-family-tab").filter({ hasText: "Candy Wrapper Archive" }).click();
  await expect(page.locator(".source-family-tab.is-selected")).toContainText("Candy Wrapper Archive");
  await expect(page.locator(".source-family-tab.is-selected")).not.toContainText(/products · \d+ proof/);
  await expect(page.locator(".source-family-tab.is-selected .source-family-tab-metric[aria-label='5 products']")).toBeVisible();
  await expect(page.locator(".source-family-tab.is-selected .source-family-tab-metric[aria-label='15 ingredient proof rows']")).toBeVisible();
  await expect(page.locator(".source-family-tab.is-selected .source-family-tab-metric[aria-label='16 local visual previews']")).toBeVisible();
  await expect(page.locator(".source-family-tab.is-selected .source-family-tab-metric[aria-label='1 readable panel still needed']")).toBeVisible();
  await expect(page.locator("#source-family-timeline-note")).not.toContainText(/products · \d+ source-backed proof cards/);
  await expect(page.locator("#source-family-timeline-note .source-family-header-metric[aria-label='5 products']")).toBeVisible();
  await expect(page.locator("#source-family-timeline-note .source-family-header-metric[aria-label='15 ingredient proof rows']")).toBeVisible();
  await expect(page.locator("#source-family-timeline-note .source-family-header-metric[aria-label='16 local visual previews']")).toBeVisible();
  await expect(page.locator("#source-family-timeline-note .source-family-header-metric[aria-label='1 readable panel still needed']")).toBeVisible();
  await expect(sourceFamilySummary.locator(".source-family-focus")).not.toContainText(/products · \d+ proof rows|local visuals · \d+ structured ingredient rows/);
  await expect(sourceFamilySummary.locator(".source-family-focus-metric[aria-label='5 products']")).toBeVisible();
  await expect(sourceFamilySummary.locator(".source-family-focus-metric[aria-label='16 proof rows']")).toBeVisible();
  await expect(sourceFamilySummary.locator(".source-family-focus-metric[aria-label='15 proof text candidates']")).toBeVisible();
  await expect(sourceFamilySummary.locator(".source-family-focus-metric[aria-label='16 local visuals']")).toBeVisible();
  await expect(sourceFamilySummary.locator(".source-family-focus-metric[aria-label='15 structured ingredient rows']")).toBeVisible();
  await expect(sourceFamilySummary.locator(".source-family-focus-metric[aria-label='1 readable panel gap']")).toBeVisible();
  await expect(page.locator(".cwa-product-chip")).toHaveCount(5);
  await expect(page.locator("#source-family-gap-summary")).toContainText("Readable panel queue");
  await expect(page.locator("#source-family-gap-summary")).toContainText("Kit Kat Bar");
  await expect(page.locator("#source-family-gap-summary")).not.toContainText("Snickers Bar");
  await expect(page.locator("#source-family-gap-summary .source-family-gap-card")).toHaveCount(1);
  await expect(page.locator("#source-family-gap-summary .source-family-gap-card").first().locator(".source-family-gap-thumb img")).toBeVisible();
  await page.locator("#source-family-gap-summary .source-family-gap-actions button[aria-label='Show Kit Kat Bar proof rows']").click();
  await expect(page.locator(".cwa-product-chip.is-selected")).toContainText("Kit Kat Bar");
  const focusedGapCard = page.locator(".cwa-timeline-card.is-gap-focus");
  await expect(focusedGapCard).toHaveCount(1);
  await expect(focusedGapCard).toContainText("Kit Kat Bar");
  await expect(focusedGapCard.locator(".cwa-preview-frame")).toHaveAttribute("aria-pressed", "true");
  await expect(focusedGapCard.locator(".cwa-ingredient-overlay")).toHaveCSS("opacity", "1");
  await expect(focusedGapCard.locator(".cwa-ingredient-overlay")).toContainText("Readable panel still needed");
  await page.locator(".cwa-product-chip").first().click();
  await expect(page.locator(".cwa-product-chip").first().locator(".cwa-product-thumb.has-proof")).toBeVisible();
  await expect(page.locator(".cwa-product-chip").first().locator(".cwa-product-thumb img")).toBeVisible();
  await expect(page.locator(".cwa-product-chip").first()).not.toContainText(/rows · \d+ proof · \d+ local/);
  await expect(page.locator(".cwa-product-chip").first().locator(".cwa-product-chip-metric[aria-label='4 visual rows']")).toBeVisible();
  await expect(page.locator(".cwa-product-chip").first().locator(".cwa-product-chip-metric[aria-label='4 ingredient proof rows']")).toBeVisible();
  await expect(page.locator(".cwa-product-chip").first().locator(".cwa-product-chip-metric[aria-label='1 readable panel still needed']")).toHaveCount(0);
  await expect(page.locator(".cwa-timeline-card")).toHaveCount(4);
  await expect(page.locator(".cwa-timeline-card").first()).toContainText("White sugar");
  await expect(page.locator(".cwa-timeline-card").first()).toContainText("malted milk");
  await expect(page.locator(".cwa-timeline-card").first()).toHaveAttribute("data-proof-basis", "archive_ingredient_label_crop");
  await expect(page.locator(".cwa-timeline-card").first().locator(".cwa-label-reader.needs-readable-panel")).toHaveCount(0);
  await expect(page.locator(".cwa-timeline-card").nth(1)).toContainText("Milk chocolate, peanuts");
  await expect(page.locator(".cwa-timeline-card").nth(1)).toHaveAttribute("data-proof-basis", "archive_ingredient_label_crop");
  await expect(page.locator(".cwa-timeline-card .status-badge")).toHaveCount(0);
  expect(await page.locator(".cwa-status-icon").count()).toBeGreaterThan(0);
  await expect(page.locator(".cwa-timeline-card").first().locator(".cwa-action-icon[aria-label^='Open source']")).toBeVisible();
  await expect(page.locator(".cwa-timeline-card").first().locator(".cwa-action-icon[aria-label='Open local private crop']")).toBeVisible();
  await expect(page.locator(".cwa-timeline-card").first().locator(".cwa-action-icon[aria-label='Open ingredient drill-in']")).toBeVisible();
  await expect(page.locator(".cwa-timeline-card").first().locator(".cwa-card-links")).not.toContainText(/Local crop|Inspect|candywrapperarchive/i);
  await expect(page.locator(".cwa-timeline-card a").first()).toHaveAttribute("href", /candywrapperarchive\.com/);
  await expect(page.locator(".cwa-timeline-card").nth(1)).toHaveCSS("transform", "none");
  await expect(page.locator(".cwa-timeline-card").nth(1).locator(".cwa-preview-frame img")).toHaveCSS("transform", "none");

  const archiveProofCard = page.locator(".cwa-timeline-card").nth(1);
  const archiveProofPreview = archiveProofCard.locator(".cwa-preview-frame");
  const archiveProofOverlay = archiveProofCard.locator(".cwa-ingredient-overlay");
  await archiveProofPreview.hover();
  await expect(archiveProofCard).toHaveClass(/is-ingredient-preview/);
  await expect(archiveProofOverlay).toHaveCSS("opacity", "1");
  await expect(archiveProofOverlay).toContainText("Milk chocolate");
  await expect(archiveProofOverlay).toHaveAttribute("aria-label", "Readable ingredient proof text");
  await expect(archiveProofOverlay.locator(".cwa-overlay-proof-meta")).toContainText("1980s_or_earlier");
  await expect(archiveProofOverlay.locator(".cwa-overlay-proof-meta")).toContainText("www.candywrapperarchive.com");
  await expect(archiveProofOverlay.locator(".cwa-overlay-proof-meta")).toContainText("Archive ingredient label crop");
  await page.mouse.move(8, 8);
  await expect(archiveProofCard).not.toHaveClass(/is-ingredient-preview/);
  await archiveProofPreview.click();
  await expect(archiveProofCard).toHaveClass(/is-ingredient-open/);
  await expect(archiveProofPreview).toHaveAttribute("aria-pressed", "true");
  await expect(archiveProofPreview).toHaveAttribute("aria-label", /Hide ingredient proof text/);
  await expect(archiveProofOverlay).toContainText("Milk chocolate");
  expect(await archiveProofCard.locator(".cwa-label-reader li").count()).toBeGreaterThan(3);

  await page.locator(".cwa-product-chip").filter({ hasText: "Tootsie Roll" }).click();
  await expect(page.locator(".cwa-timeline-card")).toHaveCount(3);
  await expect(page.locator(".cwa-timeline-card").filter({ hasText: "Tootsie Roll" })).toHaveCount(3);
  await expect(page.locator(".cwa-timeline-card").first()).toContainText("corn syrup");
  expect(await page.locator(".cwa-preview-frame").count()).toBe(3);
  expect(await page.locator(".cwa-preview-frame img, .cwa-preview-placeholder").count()).toBeGreaterThanOrEqual(3);

  await page.locator(".source-family-tab").filter({ hasText: "Flickr Package Archive" }).click();
  await expect(page.locator(".source-family-tab.is-selected")).toContainText("Flickr Package Archive");
  await expect(page.locator("#source-family-timeline-title")).toContainText("Flickr Package Archive");
  await expect(page.locator(".cwa-product-chip")).toHaveCount(14);
  await expect(page.locator("#source-family-gap-summary")).toContainText("Trix Cereal");
  await expect(page.locator("#source-family-gap-summary .source-family-gap-card")).toHaveCount(2);
  await expect(page.locator(".cwa-timeline-card").first()).toContainText(/ingredients|beverage syrup|label formula|carbonated water/i);
  await page.locator(".cwa-product-chip").filter({ hasText: "Cocoa Puffs" }).click();
  await expect(page.locator(".cwa-timeline-card")).toHaveCount(1);
  await expect(page.locator(".cwa-timeline-card").first()).toContainText("whole grain corn");
  await expect(page.locator(".cwa-timeline-card").first()).toContainText("BHT added to preserve freshness");
  await expect(page.locator(".cwa-timeline-card").first().locator(".cwa-status-icon[aria-label^='Ingredient text candidate']")).toBeVisible();
  await page.locator(".cwa-product-chip").filter({ hasText: "Doritos Nacho Cheese" }).click();
  await expect(page.locator(".cwa-timeline-card")).toHaveCount(2);
  await expect(page.locator(".cwa-timeline-card").first()).toContainText("vegetable oil with BHA and BHT");
  await expect(page.locator(".cwa-timeline-card").first()).toContainText("monosodium glutamate");
  await expect(page.locator(".cwa-timeline-card").first().locator(".cwa-status-icon[aria-label^='Ingredient text candidate']")).toBeVisible();
  await page.locator(".cwa-product-chip").filter({ hasText: "Cheerios Original" }).click();
  await expect(page.locator(".cwa-timeline-card")).toHaveCount(1);
  await expect(page.locator(".cwa-timeline-card").first()).toContainText("whole grain oats");
  await expect(page.locator(".cwa-timeline-card").first()).toContainText("trisodium phosphate");
  await expect(page.locator(".cwa-timeline-card").first().locator(".cwa-status-icon[aria-label^='Ingredient text candidate']")).toBeVisible();
  await page.locator(".cwa-product-chip").filter({ hasText: "Trix Cereal" }).click();
  await expect(page.locator(".cwa-timeline-card")).toHaveCount(2);
  await expect(page.locator(".cwa-timeline-card").first()).toContainText(/promotion\/top-flap panel only|readable ingredient panel still needed/i);
  await expect(page.locator(".cwa-timeline-card").first().locator(".cwa-label-reader-title")).toContainText("Visual proof only");
  await expect(page.locator(".cwa-timeline-card").first().locator(".cwa-label-reader-meta")).toContainText("Readable panel needed");
  await expect(page.locator(".cwa-timeline-card").first().locator(".cwa-preview-frame")).toHaveAttribute("aria-label", /Inspect visual source gap/);
  await page.locator(".cwa-timeline-card").first().locator(".cwa-preview-frame").hover();
  await expect(page.locator(".cwa-timeline-card").first().locator(".cwa-ingredient-overlay")).toContainText("Visual proof only");
  await expect(page.locator(".cwa-timeline-card").first().locator(".cwa-ingredient-overlay")).toContainText(/promotion\/top-flap panel only/i);
  await expect(page.locator(".cwa-timeline-card").first().locator(".cwa-status-icon[aria-label^='Visual lineage only']")).toBeVisible();
  await expect(page.locator(".cwa-timeline-card").first().locator(".cwa-status-icon[aria-label='Local private upscaled crop available']")).toBeVisible();
  await page.locator(".cwa-timeline-card").first().locator("[data-cwa-inspect]").click();
  await expect(page.locator("#ingredient-drilldown")).toBeVisible();
  await expect(page.locator("#ingredient-drilldown-title")).toContainText("Trix Cereal");
  await expect(page.locator("#ingredient-drilldown .ingredient-drilldown-proof-overlay")).toHaveAttribute("aria-label", "Visual source gap status");
  await expect(page.locator("#ingredient-drilldown .ingredient-drilldown-proof-overlay")).toContainText("Visual proof only");
  await expect(page.locator("#ingredient-drilldown .ingredient-drilldown-proof-overlay")).toContainText(/promotion\/top-flap panel only/i);
  await page.keyboard.press("Escape");
  await page.locator(".cwa-product-chip").filter({ hasText: "Kellogg's Froot Loops" }).click();
  await expect(page.locator(".cwa-timeline-card")).toHaveCount(2);
  await expect(page.locator(".cwa-timeline-card").first()).toContainText("partially hydrogenated vegetable oil");
  await expect(page.locator(".cwa-timeline-card").first().locator(".cwa-ingredient-copy li").first()).toContainText("sugar");
  await expect(page.locator(".cwa-timeline-card").first().locator(".cwa-label-reader-meta")).not.toContainText("candidate text");
  const frootLoopsSourceLine = page.locator(".cwa-timeline-card").first().locator(".cwa-ingredient-source-line");
  await expect(frootLoopsSourceLine).toContainText("BHT added to maintain product freshness");
  const frootLoopsTranscript = page.locator(".cwa-timeline-card").first().locator(".cwa-ingredient-transcript");
  await expect(frootLoopsTranscript.locator("summary")).toContainText("Full ingredient transcript");
  await expect.poll(async () => frootLoopsSourceLine.evaluate((element) => getComputedStyle(element).webkitLineClamp)).toBe("3");
  await page.locator(".cwa-timeline-card").first().locator(".cwa-preview-frame").click();
  await expect.poll(async () => frootLoopsSourceLine.evaluate((element) => getComputedStyle(element).webkitLineClamp)).toBe("none");
  await frootLoopsTranscript.locator("summary").click();
  await expect(frootLoopsTranscript).toHaveAttribute("open", "");
  await expect(frootLoopsTranscript.locator("p")).toContainText("BHT added to maintain product freshness");
  const frootLoopsOverlay = page.locator(".cwa-timeline-card").first().locator(".cwa-ingredient-overlay");
  expect(await frootLoopsOverlay.locator("li").count()).toBeGreaterThan(10);
  await expect(frootLoopsOverlay).toContainText("BHT added to maintain product freshness");
  await expect(page.locator(".cwa-timeline-card").first().locator(".cwa-label-reader")).toContainText("artificial coloring");
  await expect(page.locator(".cwa-timeline-card").first().locator(".cwa-ingredient-overlay")).toContainText("Ingredients");
  const ingredientFilter = page.locator(".cwa-timeline-card").first().locator(".ingredient-filter-link").filter({ hasText: "artificial coloring" }).first();
  const ingredientFilterBeforeHover = await ingredientFilter.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      fontSize: style.fontSize,
      lineHeight: style.lineHeight,
    };
  });
  await ingredientFilter.hover();
  const ingredientFilterAfterHover = await ingredientFilter.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      fontSize: style.fontSize,
      lineHeight: style.lineHeight,
      textDecorationLine: style.textDecorationLine,
    };
  });
  expect(ingredientFilterAfterHover.fontSize).toBe(ingredientFilterBeforeHover.fontSize);
  expect(ingredientFilterAfterHover.lineHeight).toBe(ingredientFilterBeforeHover.lineHeight);
  expect(ingredientFilterAfterHover.textDecorationLine).toContain("underline");
  await page.locator(".cwa-timeline-card").first().locator("[data-cwa-inspect]").click();
  await expect(page.locator("#ingredient-drilldown")).toBeVisible();
  await expect(page.locator("#ingredient-drilldown-title")).toContainText("Kellogg's Froot Loops");
  await expect(page.locator("#ingredient-drilldown")).toContainText("partially hydrogenated vegetable oil");
  await expect(page.locator("#ingredient-drilldown")).toContainText("Claim Boundary");
  await expect(page.locator("#ingredient-drilldown .ingredient-drilldown-facts")).toContainText("ingredient entries");
  await expect(page.locator("#ingredient-drilldown .ingredient-drilldown-facts")).toContainText("local crop available");
  await expect(page.locator("#ingredient-drilldown .ingredient-drilldown-facts")).toContainText("Flickr Package Archive");
  const drilldownIngredientCopy = page.locator("#ingredient-drilldown .cwa-ingredient-copy").first();
  await expect(drilldownIngredientCopy.locator("ul")).toBeVisible();
  await expect(drilldownIngredientCopy.locator("ul")).toContainText("sugar");
  await expect(drilldownIngredientCopy.locator("ul + .cwa-ingredient-source-line")).toContainText("BHT added to maintain product freshness");
  await expect(drilldownIngredientCopy.locator(".cwa-ingredient-transcript summary")).toContainText("Full ingredient transcript");
  await drilldownIngredientCopy.locator(".cwa-ingredient-transcript summary").click();
  await expect(drilldownIngredientCopy.locator(".cwa-ingredient-transcript")).toHaveAttribute("open", "");
  await expect(drilldownIngredientCopy.locator(".cwa-ingredient-transcript p")).toContainText("BHT added to maintain product freshness");
  await expect(page.locator("#ingredient-drilldown .ingredient-drilldown-trends")).toContainText("Shared visual ingredient signals");
  await expect(page.locator("#ingredient-drilldown .ingredient-drilldown-trends > small")).toContainText(/products · \d+ proof rows/);
  await expect(page.locator("#ingredient-drilldown .ingredient-drilldown-trends")).toHaveAttribute("aria-label", /Shared ingredient proof signals across/);
  const artificialColoringTrend = page.locator("#ingredient-drilldown .ingredient-drilldown-trends button").filter({ hasText: "artificial coloring" });
  await expect(artificialColoringTrend).toBeVisible();
  await expect(artificialColoringTrend.locator(".ingredient-drilldown-trend-thumbs")).toBeVisible();
  await expect(artificialColoringTrend.locator(".ingredient-drilldown-trend-thumbs")).not.toHaveAttribute("aria-hidden", "true");
  expect(await artificialColoringTrend.locator(".ingredient-drilldown-trend-thumb img").count()).toBeGreaterThanOrEqual(2);
  await expect(artificialColoringTrend.locator(".ingredient-drilldown-trend-thumb").first()).toHaveAttribute("role", "img");
  await expect(artificialColoringTrend.locator(".ingredient-drilldown-trend-thumb").first()).toHaveAttribute("aria-label", /Kellogg|Froot|ingredient|proof/i);
  await expect(artificialColoringTrend.locator(".ingredient-drilldown-trend-thumb").first()).toHaveAttribute("data-proof-product", /Kellogg|Froot/i);
  await expect(artificialColoringTrend.locator(".ingredient-drilldown-trend-thumb").first()).toHaveAttribute("data-proof-vintage", /[A-Za-z0-9]/);
  await expect(artificialColoringTrend.locator(".ingredient-drilldown-trend-thumb").first()).toHaveAttribute("data-proof-basis", /ingredient|proof|crop/i);
  await expect(artificialColoringTrend.locator(".ingredient-drilldown-trend-thumb img").first()).toHaveAttribute("src", /\/api\/private\/ingredient-crops\//);
  await expect(page.locator("#ingredient-drilldown .ingredient-drilldown-image img, #ingredient-drilldown .ingredient-drilldown-placeholder")).toBeVisible();
  const drilldownProofOverlay = page.locator("#ingredient-drilldown .ingredient-drilldown-proof-overlay");
  await expect(drilldownProofOverlay).toBeVisible();
  expect(await drilldownProofOverlay.locator("li").count()).toBeGreaterThan(10);
  await expect(drilldownProofOverlay).toContainText("BHT added to maintain product freshness");
  await expect(drilldownProofOverlay).toHaveCSS("background-color", "rgb(255, 250, 240)");
  await expect(drilldownProofOverlay).toHaveCSS("bottom", "12px");
  const drilldownImagePane = page.locator("#ingredient-drilldown .ingredient-drilldown-image");
  const drilldownImage = page.locator("#ingredient-drilldown .ingredient-drilldown-image img");
  const drilldownGuide = await drilldownImagePane.evaluate((element) => {
    const style = getComputedStyle(element, "::before");
    return {
      backgroundImage: style.backgroundImage,
      height: Number.parseFloat(style.height),
    };
  });
  expect(drilldownGuide.backgroundImage).toContain("repeating-linear-gradient");
  expect(drilldownGuide.height).toBeGreaterThan(100);
  if (await drilldownImage.count()) {
    await expect(drilldownImage).toHaveCSS("transform", "none");
    await expect(drilldownImagePane).toHaveClass(/has-private-preview/);
    const drilldownPaneMetrics = await drilldownImagePane.evaluate((element) => ({
      clientWidth: element.clientWidth,
      scrollWidth: element.scrollWidth,
    }));
    expect(drilldownPaneMetrics.scrollWidth).toBeGreaterThan(drilldownPaneMetrics.clientWidth);
  }
  await page.locator("#ingredient-drilldown .ingredient-filter-link").filter({ hasText: "artificial coloring" }).click();
  await expect(page.locator("#ingredient-drilldown")).toBeHidden();
  await expect(page.locator("#source-family-search")).toHaveValue("artificial coloring");
  await expect(page.locator("#source-family-filter-status")).toContainText("1 of 14 products");
  await expect(page.locator(".cwa-product-chip")).toHaveCount(1);
  await expect(page.locator(".cwa-product-chip").first()).toContainText("Kellogg's Froot Loops");
  await expect(page.locator(".cwa-product-chip").first().locator(".cwa-product-thumb img")).toBeVisible();
  await expect(page.locator(".cwa-timeline-card").first()).toContainText("artificial coloring");
  await page.locator("#source-family-filter-clear").click();
  await expect(page.locator(".cwa-product-chip")).toHaveCount(14);

  await page.locator(".cwa-product-chip").filter({ hasText: "7UP Original" }).click();
  await expect(page.locator(".cwa-timeline-card")).toHaveCount(2);
  await expect(page.locator(".cwa-timeline-card").first()).toContainText("carbonated water");
  const sevenUpProofImage = page.locator(".cwa-timeline-card").first().locator(".cwa-preview-frame img");
  await expect(sevenUpProofImage).toBeVisible();
  const sevenUpImageSize = await sevenUpProofImage.evaluate((image) => ({
    width: image.naturalWidth,
    height: image.naturalHeight,
  }));
  expect(sevenUpImageSize.width).toBeGreaterThan(sevenUpImageSize.height);
  await expect(sevenUpProofImage).toHaveCSS("transform", "none");

  await page.locator(".source-family-tab").filter({ hasText: "Label Database Text Leads" }).click();
  await expect(page.locator(".source-family-tab.is-selected")).toContainText("Label Database Text Leads");
  await expect(page.locator("#source-family-timeline-title")).toContainText("Label Database Text Leads");
  await expect(page.locator(".cwa-product-chip")).toHaveCount(8);
  await expect(page.locator("#source-family-filter-status")).toContainText("8 products");
  await page.locator(".cwa-product-chip").filter({ hasText: "Dr Pepper Original" }).click();
  await expect(page.locator(".cwa-timeline-card")).toHaveCount(1);
  await expect(page.locator(".cwa-timeline-card").first()).toHaveAttribute("data-proof-basis", "label_database_source_text_proof_panel");
  await expect(page.locator(".cwa-timeline-card").first()).toContainText("Carbonated Water");
  await expect(page.locator(".cwa-timeline-card").first()).toContainText("Sodium Benzoate");
  await page.locator(".cwa-product-chip").filter({ hasText: "Cap'n Crunch Original" }).click();
  await expect(page.locator(".cwa-timeline-card")).toHaveCount(1);
  await expect(page.locator(".cwa-timeline-card").first()).toContainText("Oat Flour");
  await expect(page.locator(".cwa-timeline-card").first()).toContainText("BHT");
  await page.locator(".cwa-product-chip").filter({ hasText: "Chef Boyardee Beefaroni" }).click();
  await expect(page.locator(".cwa-timeline-card")).toHaveCount(1);
  await expect(page.locator(".cwa-timeline-card").first()).toContainText("Textured Vegetable Protein");
  await expect(page.locator(".cwa-timeline-card").first()).toContainText("Contains: Milk");
  await expect(page.locator(".cwa-timeline-card").first()).toContainText("Wheat");
  await page.locator(".cwa-product-chip").filter({ hasText: "Hot Pockets Pepperoni Pizza" }).click();
  await expect(page.locator(".cwa-timeline-card")).toHaveCount(1);
  await expect(page.locator(".cwa-timeline-card").first()).toContainText("Pepperoni");
  await expect(page.locator(".cwa-timeline-card").first()).toContainText("Reduced Fat Mozzarella Cheese");
  await page.locator(".cwa-product-chip").filter({ hasText: "Little Debbie Swiss Rolls" }).click();
  await expect(page.locator(".cwa-timeline-card")).toHaveCount(1);
  await expect(page.locator(".cwa-timeline-card").first()).toContainText("TBHQ and Citric Acid");
  await expect(page.locator(".cwa-timeline-card").first()).toContainText("Whey (Milk)");
  await page.locator(".cwa-product-chip").filter({ hasText: "Hostess CupCakes" }).click();
  await expect(page.locator(".cwa-timeline-card")).toHaveCount(1);
  await expect(page.locator(".cwa-timeline-card").first()).toContainText("High Fructose Corn Syrup");
  await expect(page.locator(".cwa-timeline-card").first()).toContainText("Titanium Dioxide");
  await page.locator(".cwa-product-chip").filter({ hasText: "Hostess Twinkies" }).click();
  await expect(page.locator(".cwa-timeline-card")).toHaveCount(1);
  await expect(page.locator(".cwa-timeline-card").first()).toHaveAttribute("data-proof-basis", "label_database_source_text_proof_panel");
  await expect(page.locator(".cwa-timeline-card").first()).toContainText("Partially Hydrogenated Vegetable Shortening");
  await expect(page.locator(".cwa-timeline-card").first()).toContainText("Color Added");
  await expect(page.locator(".cwa-timeline-card").first()).toContainText("Yellow 5");
  await expect(page.locator(".cwa-timeline-card").first().locator(".cwa-status-icon[aria-label^='Ingredient text candidate from a label database source']")).toBeVisible();
  const twinkiesPreview = page.locator(".cwa-timeline-card").first().locator(".cwa-preview-frame");
  const twinkiesOverlay = page.locator(".cwa-timeline-card").first().locator(".cwa-ingredient-overlay");
  await expect(twinkiesPreview.locator("img")).toBeVisible();
  await twinkiesPreview.hover();
  await expect(twinkiesOverlay).toContainText("Ingredient source text");
  await expect(twinkiesOverlay).toContainText("Partially Hydrogenated");
  await page.locator(".cwa-product-chip").filter({ hasText: "Nilla Wafers" }).click();
  await expect(page.locator(".cwa-timeline-card")).toHaveCount(1);
  await expect(page.locator(".cwa-timeline-card").first()).toHaveAttribute("data-proof-basis", "label_database_source_text_proof_panel");
  await expect(page.locator(".cwa-timeline-card").first()).toContainText("Unbleached Enriched Flour");
  await expect(page.locator(".cwa-timeline-card").first()).toContainText("High Fructose Corn Syrup");
  await expect(page.locator(".cwa-timeline-card").first()).toContainText("Soy Lecithin");
  await expect(page.locator(".cwa-timeline-card").first().locator(".cwa-status-icon[aria-label^='Ingredient text candidate from a label database source']")).toBeVisible();
  const labelDatabasePreview = page.locator(".cwa-timeline-card").first().locator(".cwa-preview-frame");
  const labelDatabaseOverlay = page.locator(".cwa-timeline-card").first().locator(".cwa-ingredient-overlay");
  await expect(labelDatabasePreview.locator("img")).toBeVisible();
  await labelDatabasePreview.hover();
  await expect(labelDatabaseOverlay).toContainText("Ingredient source text");
  await expect(labelDatabaseOverlay).toContainText("Unbleached Enriched Flour");
  await page.locator(".cwa-timeline-card").first().locator("[data-cwa-inspect]").click();
  await expect(page.locator("#ingredient-drilldown")).toBeVisible();
  await expect(page.locator("#ingredient-drilldown-title")).toContainText("Nilla Wafers");
  await expect(page.locator("#ingredient-drilldown")).toContainText("Label database proof panel");
  await expect(page.locator("#ingredient-drilldown")).toContainText("Package image review is required");
  await expect(page.locator("#ingredient-drilldown")).toContainText("High Fructose Corn Syrup");
  await page.keyboard.press("Escape");

  await page.locator(".source-family-tab").filter({ hasText: "Collection Targets" }).click();
  await expect(page.locator(".source-family-tab.is-selected")).toContainText("Collection Targets");
  await expect(page.locator(".source-family-tab.is-selected .source-family-tab-metric[aria-label='2 products']")).toBeVisible();
  await expect(page.locator(".source-family-tab.is-selected .source-family-tab-metric[aria-label='0 ingredient proof rows']")).toBeVisible();
  await expect(page.locator(".source-family-tab.is-selected .source-family-tab-metric[aria-label='8 readable panels still needed']")).toBeVisible();
  await expect(page.locator("#source-family-timeline-title")).toContainText("Collection Targets Board");
  await expect(page.locator("#source-family-filter-status")).toContainText("2 products · 8 source leads");
  await expect(sourceFamilySummary.locator(".source-family-focus-metric[aria-label='2 products']")).toBeVisible();
  await expect(sourceFamilySummary.locator(".source-family-focus-metric[aria-label='8 source leads']")).toBeVisible();
  await expect(sourceFamilySummary.locator(".source-family-focus-metric[aria-label='0 proof text candidates']")).toBeVisible();
  await expect(sourceFamilySummary.locator(".source-family-focus-metric[aria-label='8 readable panel gaps']")).toBeVisible();
  await expect(page.locator(".cwa-product-chip")).toHaveCount(2);
  await expect(page.locator(".cwa-product-chip").first()).toContainText("Starbucks Pumpkin Spice Latte");
  await expect(page.locator(".cwa-product-chip").first().locator(".cwa-product-chip-metric[aria-label='4 source leads']")).toBeVisible();
  await expect(page.locator(".cwa-product-chip").first().locator(".cwa-product-chip-metric[aria-label='0 ingredient proof rows']")).toBeVisible();
  await expect(page.locator(".cwa-timeline-card")).toHaveCount(4);
  await expect(page.locator(".cwa-timeline-card").first()).toHaveAttribute("data-proof-basis", "collection_target_source_lead");
  await expect(page.locator(".cwa-timeline-card").first()).toContainText("Official Starbucks source cache blocked");
  await expect(page.locator(".cwa-timeline-card").first().locator(".cwa-preview-placeholder")).toBeVisible();
  await expect(page.locator(".cwa-timeline-card").first().locator(".cwa-status-icon[aria-label^='Collection source lead']")).toBeVisible();
  await expect(page.locator(".cwa-timeline-card").first().locator(".collection-lead-facts")).toContainText("High priority");
  await expect(page.locator(".cwa-timeline-card").first().locator(".collection-lead-facts")).toContainText("Menu Or Nutrition Document");
  await expect(page.locator(".cwa-timeline-card").first().locator(".collection-lead-facts")).toContainText("Panel not visible");
  await expect(page.locator(".cwa-timeline-card").first().locator(".collection-lead-facts")).toContainText("Document Text Pipeline Needed");
  await expect(page.locator(".cwa-timeline-card").first().locator(".cwa-action-icon[aria-label='Open local private crop']")).toHaveCount(0);
  await page.locator(".cwa-timeline-card").first().locator("[data-cwa-inspect]").click();
  await expect(page.locator("#ingredient-drilldown")).toBeVisible();
  await expect(page.locator("#ingredient-drilldown-title")).toContainText("Starbucks Pumpkin Spice Latte");
  await expect(page.locator("#ingredient-drilldown")).toContainText("Collection source lead");
  await expect(page.locator("#ingredient-drilldown .ingredient-drilldown-collection-lead")).toContainText("Collection next action");
  await expect(page.locator("#ingredient-drilldown .ingredient-drilldown-collection-lead")).toContainText("Capture a Starbucks-owned menu");
  await expect(page.locator("#ingredient-drilldown .ingredient-drilldown-collection-lead")).toContainText("Accepted proof");
  await expect(page.locator("#ingredient-drilldown .ingredient-drilldown-collection-lead")).toContainText("Do not use");
  await expect(page.locator("#ingredient-drilldown .ingredient-drilldown-collection-lead")).toContainText("Starbucks-owned allergen or ingredient document");
  await expect(page.locator("#ingredient-drilldown .ingredient-drilldown-collection-lead")).toContainText("secondary nutrition articles or recipes");
  await expect(page.locator("#ingredient-drilldown .ingredient-drilldown-collection-lead .collection-lead-facts")).toContainText("High priority");
  await expect(page.locator("#ingredient-drilldown")).toContainText("Do not promote PSL ingredient composition");
  await page.keyboard.press("Escape");
  await page.locator(".cwa-product-chip").filter({ hasText: "KFC Original Recipe Chicken" }).click();
  await expect(page.locator(".cwa-timeline-card")).toHaveCount(4);
  const kfcSourceTitles = await page.locator(".cwa-timeline-card .cwa-source-title").allInnerTexts();
  expect(kfcSourceTitles[0]).toMatch(/1970s|Colonel Sanders/i);
  expect(kfcSourceTitles[1]).toMatch(/2008|Flickr album/i);
  expect(kfcSourceTitles.slice(2).join(" ")).toMatch(/KFC Chicken and Nutrition|Food Innovation/i);
  await expect(page.locator(".cwa-timeline-card").first()).toContainText("Kentucky Fried Chicken Colonel Sanders");
  await expect(page.locator(".cwa-timeline-card").first()).toContainText("Item-level ingredient source needed");
  await expect(page.locator(".cwa-timeline-card").first().locator(".collection-lead-facts")).toContainText("Panel not visible");

  await page.locator(".source-family-tab").filter({ hasText: "Official Current Labels" }).click();
  await expect(page.locator(".source-family-tab.is-selected")).toContainText("Official Current Labels");
  await expect(page.locator(".cwa-product-chip")).toHaveCount(105);
  await expect(page.locator("#source-family-filter-status")).toContainText("105 products");
  await page.locator(".cwa-product-chip").filter({ hasText: "Pearl Milling Company Original Pancake Mix" }).click();
  await expect(page.locator(".cwa-timeline-card")).toHaveCount(1);
  await expect(page.locator(".cwa-timeline-card").first()).toContainText("Enriched Bleached Flour");
  await expect(page.locator(".cwa-timeline-card").first()).toContainText("Calcium Carbonate");
  await expect(page.locator(".cwa-timeline-card").first()).toHaveAttribute("data-proof-basis", "official_source_text_proof_panel");
  await expect(page.locator("#source-family-ingredient-summary")).toContainText("Frequent ingredients");
  const sugarTrend = page.locator(".source-family-ingredient-bar").filter({ hasText: "sugar" }).first();
  await expect(sugarTrend).toBeVisible();
  await expect(sugarTrend).toHaveAttribute("aria-label", /58 proof rows, 58 products, 58 local visual previews/);
  await expect(sugarTrend.locator(".source-family-ingredient-metric[aria-label='58 proof rows']")).toBeVisible();
  await expect(sugarTrend.locator(".source-family-ingredient-metric[aria-label='58 products']")).toBeVisible();
  await expect(sugarTrend.locator(".source-family-ingredient-metric[aria-label='58 local visual previews']")).toBeVisible();
  await expect(sugarTrend).toHaveAttribute("aria-label", /proof examples:/);
  await expect(sugarTrend.locator(".source-family-ingredient-proof-strip")).toBeVisible();
  expect(await sugarTrend.locator(".source-family-ingredient-proof-thumb img").count()).toBeGreaterThan(0);
  await expect(sugarTrend.locator(".source-family-ingredient-proof-thumbs")).not.toHaveAttribute("aria-hidden", "true");
  await expect(sugarTrend.locator(".source-family-ingredient-proof-thumb").first()).toHaveAttribute("role", "img");
  await expect(sugarTrend.locator(".source-family-ingredient-proof-thumb").first()).toHaveAttribute("aria-label", /source text proof|ingredient/i);
  await expect(sugarTrend.locator(".source-family-ingredient-proof-thumb").first()).toHaveAttribute("data-proof-product", /[A-Za-z]/);
  await expect(sugarTrend.locator(".source-family-ingredient-proof-thumb").first()).toHaveAttribute("data-proof-vintage", /[A-Za-z0-9]/);
  await expect(sugarTrend.locator(".source-family-ingredient-proof-thumb").first()).toHaveAttribute("data-proof-basis", /source text proof|ingredient/i);
  await expect(sugarTrend.locator(".source-family-ingredient-proof-thumb img").first()).toHaveAttribute("src", /\/api\/private\/ingredient-crops\//);
  await expect(sugarTrend.locator(".source-family-ingredient-proof-names")).toContainText(/[A-Za-z]/);
  await page.locator(".source-family-ingredient-bar").filter({ hasText: "sugar" }).first().click();
  await expect(page.locator("#source-family-search")).toHaveValue(/sugar/i);
  await expect(page.locator("#source-family-filter-status")).toContainText("of 105 products");
  await expect(page.locator("#source-family-ingredient-summary .source-family-ingredient-summary-title")).toContainText("Filtered ingredients");
  await expect(page.locator("#source-family-ingredient-summary .source-family-ingredient-summary-title small")).toContainText(/sugar/i);
  await expect(page.locator(".cwa-timeline-card").first().locator(".ingredient-filter-link.is-filter-match").first()).toContainText(/sugar/i);
  await expect(page.locator(".cwa-timeline-card").first().locator(".ingredient-filter-link.is-filter-match").first()).toHaveAttribute("aria-current", "true");
  await page.locator(".cwa-timeline-card").first().locator(".cwa-preview-frame").hover();
  await expect(page.locator(".cwa-timeline-card").first().locator(".cwa-overlay-ingredient-list li.is-filter-match").first()).toContainText(/sugar/i);
  await expect(page.locator(".cwa-timeline-card").first().locator(".cwa-overlay-ingredient-list li.is-filter-match").first()).toHaveAttribute("data-filter-match", "true");
  await expect(page.locator(".cwa-product-chip")).not.toHaveCount(105);
  await page.locator("#source-family-filter-clear").click();
  await page.locator("#source-family-search").fill("sodium alginate");
  await expect(page.locator("#source-family-filter-status")).toContainText("1 of 105 products");
  await expect(page.locator(".cwa-product-chip")).toHaveCount(1);
  await expect(page.locator(".cwa-product-chip").first()).toContainText("Velveeta Shells & Cheese");
  await expect(page.locator(".cwa-timeline-card")).toHaveCount(1);
  await expect(page.locator(".cwa-timeline-card").first()).toContainText("SODIUM ALGINATE");
  await expect(page.locator(".cwa-timeline-card").first().locator(".ingredient-filter-link.is-filter-match")).toContainText("SODIUM ALGINATE");
  await page.locator(".cwa-timeline-card").first().locator("[data-cwa-inspect]").click();
  await expect(page.locator("#ingredient-drilldown .ingredient-drilldown-proof-overlay li.is-filter-match")).toContainText("SODIUM ALGINATE");
  await page.keyboard.press("Escape");
  await expect(page.locator("#source-family-position")).toContainText("1 / 1");
  await expect(page.locator("#source-family-prev")).toBeDisabled();
  await expect(page.locator("#source-family-next")).toBeDisabled();
  await page.locator("#source-family-filter-clear").click();
  await page.locator("#source-family-search").fill("flame-grilled");
  await expect(page.locator("#source-family-filter-status")).toContainText("1 of 105 products");
  await expect(page.locator(".cwa-product-chip")).toHaveCount(1);
  await expect(page.locator(".cwa-product-chip").first()).toContainText("Burger King Whopper");
  await expect(page.locator(".cwa-timeline-card")).toHaveCount(1);
  await expect(page.locator(".cwa-timeline-card").first()).toContainText("flame-grilled, 100% real beef");
  await expect(page.locator(".cwa-timeline-card").first().locator(".cwa-label-reader-title")).toContainText("Menu reader");
  await page.locator("#source-family-filter-clear").click();
  await expect(page.locator("#source-family-search")).toHaveValue("");
  await expect(page.locator(".cwa-product-chip")).toHaveCount(105);
  await expect(page.locator("#source-family-position")).toContainText("1 / 105");
  await expect(page.locator("#source-family-prev")).toBeDisabled();
  await expect(page.locator("#source-family-next")).toBeEnabled();
  await page.locator("#source-family-next").click();
  await expect(page.locator("#source-family-position")).toContainText("2 / 105");
  await expect(page.locator(".cwa-product-chip.is-selected")).toContainText("Banquet Chicken Pot Pie");
  await page.locator("#source-family-prev").click();
  await expect(page.locator("#source-family-position")).toContainText("1 / 105");
  await expect(page.locator(".cwa-product-chip.is-selected")).toContainText("Ball Park Franks");
  await page.locator("#source-family-search").fill("zzzz no ingredient match");
  await expect(page.locator("#source-family-filter-status")).toContainText("0 of 105 products");
  await expect(page.locator(".cwa-product-chip")).toHaveCount(0);
  await expect(page.locator(".cwa-timeline-empty")).toBeVisible();
  await expect(page.locator("#source-family-ingredient-summary")).toContainText("No structured ingredient trend rows");
  await expect(page.locator("#source-family-position")).toContainText("0 / 0");
  await page.locator("#source-family-filter-clear").click();
  await expect(page.locator(".cwa-product-chip")).toHaveCount(105);
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
  await page.locator(".cwa-product-chip").filter({ hasText: "Pizza Hut Original Pan Pepperoni" }).click();
  await expect(page.locator(".cwa-timeline-card")).toHaveCount(1);
  await expect(page.locator(".cwa-timeline-card").first()).toContainText("Pepperoni topping");
  await expect(page.locator(".cwa-timeline-card").first()).toContainText("natural spice extractives");
  await page.locator(".cwa-product-chip").filter({ hasText: "Wendy's Dave's Single" }).click();
  await expect(page.locator(".cwa-timeline-card")).toHaveCount(1);
  await expect(page.locator(".cwa-timeline-card").first()).toContainText("Potato Bun");
  await expect(page.locator(".cwa-timeline-card").first()).toContainText("Ground Beef");
  await page.locator(".cwa-product-chip").filter({ hasText: "Wendy's Chili" }).click();
  await expect(page.locator(".cwa-timeline-card")).toHaveCount(1);
  await expect(page.locator(".cwa-timeline-card").first()).toContainText("Chili Beans");
  await page.locator(".cwa-product-chip").filter({ hasText: "Taco Bell Crunchy Taco" }).click();
  await expect(page.locator(".cwa-timeline-card")).toHaveCount(1);
  await expect(page.locator(".cwa-timeline-card").first()).toHaveAttribute("data-proof-basis", "official_menu_or_api_text");
  await expect(page.locator(".cwa-timeline-card").first()).toContainText("Taco Shell");
  await expect(page.locator(".cwa-timeline-card").first()).toContainText("Seasoned Beef");
  await page.locator(".cwa-product-chip").filter({ hasText: "Domino's Hand Tossed Pepperoni" }).click();
  await expect(page.locator(".cwa-timeline-card")).toHaveCount(1);
  await expect(page.locator(".cwa-timeline-card").first()).toHaveAttribute("data-proof-basis", "official_menu_or_api_text");
  await expect(page.locator(".cwa-timeline-card").first()).toContainText("HAND TOSSED CRUST");
  await expect(page.locator(".cwa-timeline-card").first()).toContainText("PIZZA SAUCE");
  await expect(page.locator(".cwa-timeline-card").first()).toContainText("PEPPERONI");
  await page.locator(".cwa-product-chip").filter({ hasText: "Dunkin' Glazed Donut" }).click();
  await expect(page.locator(".cwa-timeline-card")).toHaveCount(1);
  await expect(page.locator(".cwa-timeline-card").first()).toHaveAttribute("data-proof-basis", "official_menu_or_api_text");
  await expect(page.locator(".cwa-timeline-card").first()).toContainText("Yeast Donut Concentrate");
  await expect(page.locator(".cwa-timeline-card").first()).toContainText("Glaze");
  await page.locator(".cwa-product-chip").filter({ hasText: "Popeyes Chicken Sandwich" }).click();
  await expect(page.locator(".cwa-timeline-card")).toHaveCount(1);
  await expect(page.locator(".cwa-timeline-card").first()).toHaveAttribute("data-proof-basis", "official_menu_or_api_text");
  await expect(page.locator(".cwa-timeline-card").first()).toContainText("Chicken Filet");
  await expect(page.locator(".cwa-timeline-card").first()).toContainText("Brioche Bun");
  await expect(page.locator(".cwa-timeline-card").first()).toContainText("Pickles");
  await page.locator(".cwa-product-chip").filter({ hasText: "Little Debbie Oatmeal Creme Pies" }).click();
  await expect(page.locator(".cwa-timeline-card")).toHaveCount(1);
  await expect(page.locator(".cwa-timeline-card").first()).toHaveAttribute("data-proof-basis", "official_source_text_proof_panel");
  await expect(page.locator(".cwa-timeline-card").first()).toContainText("Whole Grain Rolled Oats");
  await expect(page.locator(".cwa-timeline-card").first()).toContainText("Sorbic Acid");
  await page.locator(".cwa-product-chip").filter({ hasText: "Taco Bell Bean Burrito" }).click();
  await expect(page.locator(".cwa-timeline-card")).toHaveCount(1);
  await expect(page.locator(".cwa-timeline-card").first()).toContainText("Flour Tortilla");
  await expect(page.locator(".cwa-timeline-card").first()).toContainText("Seasoned Refried Beans");
  await page.locator(".cwa-product-chip").filter({ hasText: "Cheerios Original" }).click();
  await expect(page.locator(".cwa-timeline-card")).toHaveCount(1);
  await expect(page.locator(".cwa-timeline-card").first()).toContainText("Whole Grain Oats");
  await page.locator(".cwa-product-chip").filter({ hasText: "Cinnamon Toast Crunch" }).click();
  await expect(page.locator(".cwa-timeline-card")).toHaveCount(1);
  await expect(page.locator(".cwa-timeline-card").first()).toContainText("Trisodium Phosphate");
  await page.locator(".cwa-product-chip").filter({ hasText: "Lucky Charms" }).click();
  await expect(page.locator(".cwa-timeline-card")).toHaveCount(1);
  await expect(page.locator(".cwa-timeline-card").first()).toContainText("Whole Grain Oats");
  await expect(page.locator(".cwa-timeline-card").first()).toContainText("Trisodium Phosphate");
  await page.locator(".cwa-product-chip").filter({ hasText: "Hidden Valley Original Ranch" }).click();
  await expect(page.locator(".cwa-timeline-card")).toHaveCount(1);
  await expect(page.locator(".cwa-timeline-card").first()).toHaveAttribute("data-proof-basis", "official_ingredient_label_image");
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
  await page.locator(".cwa-product-chip").filter({ hasText: "Jell-O Strawberry Gelatin" }).click();
  await expect(page.locator(".cwa-timeline-card")).toHaveCount(1);
  await expect(page.locator(".cwa-timeline-card").first()).toContainText("GELATIN");
  await expect(page.locator(".cwa-timeline-card").first()).toContainText("RED 40");
  await page.locator(".cwa-product-chip").filter({ hasText: "Pringles Original Crisps" }).click();
  await expect(page.locator(".cwa-timeline-card")).toHaveCount(1);
  await expect(page.locator(".cwa-timeline-card").first()).toContainText("DRIED POTATOES");
  await page.locator(".cwa-product-chip").filter({ hasText: "Chick-fil-A Chicken Sandwich" }).click();
  await expect(page.locator(".cwa-timeline-card")).toHaveCount(1);
  await expect(page.locator(".cwa-timeline-card").first()).toContainText("monosodium glutamate");
  await page.locator(".cwa-product-chip").filter({ hasText: "M&M's Milk Chocolate Candies" }).click();
  await expect(page.locator(".cwa-timeline-card")).toHaveCount(1);
  await expect(page.locator(".cwa-timeline-card").first()).toContainText("carnauba wax");
  await page.locator(".cwa-product-chip").filter({ hasText: "Reese's Peanut Butter Cups" }).click();
  await expect(page.locator(".cwa-timeline-card")).toHaveCount(1);
  await expect(page.locator(".cwa-timeline-card").first()).toContainText("Peanuts");
  await expect(page.locator(".cwa-timeline-card").first()).toContainText("Dextrose");
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
  await expect(page.locator(".cwa-timeline-card").first()).toHaveAttribute("data-proof-basis", "official_ingredient_label_image");
  await expect(page.locator(".cwa-timeline-card").first()).toContainText("malt flavor");
  await page.locator(".cwa-product-chip").filter({ hasText: "Kellogg's Corn Flakes" }).click();
  await expect(page.locator(".cwa-timeline-card")).toHaveCount(1);
  await expect(page.locator(".cwa-timeline-card").first()).toHaveAttribute("data-proof-basis", "official_ingredient_label_image");
  await expect(page.locator(".cwa-timeline-card").first()).toContainText("Milled corn");
  await page.locator(".cwa-product-chip").filter({ hasText: "Kellogg's Froot Loops" }).click();
  await expect(page.locator(".cwa-timeline-card")).toHaveCount(1);
  await expect(page.locator(".cwa-timeline-card").first()).toHaveAttribute("data-proof-basis", "official_ingredient_label_image");
  await expect(page.locator(".cwa-timeline-card").first()).toContainText("Corn flour blend");
  await expect(page.locator(".cwa-timeline-card").first()).toContainText("red 40");
  await expect(page.locator(".cwa-timeline-card").first()).toContainText("blue 1");
  await page.locator(".cwa-timeline-card").first().locator(".cwa-preview-frame").click();
  await expect(page.locator(".cwa-timeline-card").first().locator(".cwa-label-reader")).toContainText("red 40");
  await page.locator(".cwa-product-chip").filter({ hasText: "Kellogg's Frosted Flakes" }).click();
  await expect(page.locator(".cwa-timeline-card")).toHaveCount(1);
  await expect(page.locator(".cwa-timeline-card").first()).toHaveAttribute("data-proof-basis", "official_ingredient_label_image");
  await expect(page.locator(".cwa-timeline-card").first()).toContainText("malt flavor");
  await page.locator(".cwa-product-chip").filter({ hasText: "Rice Krispies Treats Original" }).click();
  await expect(page.locator(".cwa-timeline-card")).toHaveCount(1);
  await expect(page.locator(".cwa-timeline-card").first()).toContainText("Toasted rice cereal");
  await expect(page.locator(".cwa-timeline-card").first()).toContainText("TBHQ for freshness");
  await page.locator(".cwa-product-chip").filter({ hasText: "Eggo Homestyle Waffles" }).click();
  await expect(page.locator(".cwa-timeline-card")).toHaveCount(1);
  await expect(page.locator(".cwa-timeline-card").first()).toContainText("Enriched flour");
  await expect(page.locator(".cwa-timeline-card").first()).toContainText("soy lecithin");
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
