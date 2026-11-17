const { test, expect } = require("@playwright/test");

test("worker serves the static shell, snapshot fallback, and ask gate", async ({ page, request }) => {
  await page.goto("/");
  await expect(page.locator("h1")).toHaveText("MenuGraph");

  const snapshot = await request.get("/data/menus.json");
  expect(snapshot.ok()).toBeTruthy();
  expect(snapshot.headers()["x-menugraph-data"]).toBe("asset-fallback");
  const payload = await snapshot.json();
  expect(Array.isArray(payload.menus)).toBeTruthy();

  const locked = await request.post("/api/chat", { data: { question: "lobster prices" } });
  expect(locked.status()).toBe(401);
  expect(await locked.json()).toEqual({ error: "Ask secret required" });
});
