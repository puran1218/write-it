import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import path from "node:path";

const CDN_DATA_MARKER = "/static/zi/data/";
const LOCAL_DATA_ROOT = path.resolve("static/zi/data");

async function fixtureJson(relativePath) {
  const file = path.resolve(LOCAL_DATA_ROOT, relativePath);
  if (!file.startsWith(LOCAL_DATA_ROOT + path.sep)) {
    throw new Error("Invalid data fixture path: " + relativePath);
  }
  return readFile(file, "utf8");
}

async function routeData(page, intercept = null) {
  await page.route("https://cdn.jsdelivr.net/gh/puran1218/write-it@data-v1/**", async route => {
    const url = route.request().url();
    const index = url.indexOf(CDN_DATA_MARKER);
    if (index < 0) throw new Error("Unexpected CDN path: " + url);
    const relativePath = decodeURIComponent(url.slice(index + CDN_DATA_MARKER.length).split("?")[0]);
    const response = async () => route.fulfill({
      status: 200,
      contentType: "application/json",
      body: await fixtureJson(relativePath),
    });
    if (intercept && await intercept({ route, relativePath, respond: response })) return;
    await response();
  });
}

test("home renders starter characters and navigation", async ({ page }) => {
  await routeData(page);
  await page.goto("./");
  await expect(page.locator(".app-title")).toHaveText("字");
  await expect(page.locator(".today-character")).not.toBeEmpty();
  await expect(page.locator('[data-nav="search"]').first()).toBeVisible();
});

test("single-character search does not request stroke manifest or packs", async ({ page }) => {
  const requested = [];
  await routeData(page, async ({ relativePath }) => { requested.push(relativePath); return false; });
  await page.goto("./#/search");
  await page.locator(".search-input").fill("花");
  await expect(page.locator(".search-result .result-char")).toHaveText("花");
  expect(requested).toContain("characters.json");
  expect(requested.some(name => name.startsWith("strokes-") || name.startsWith("strokes-packs/"))).toBe(false);
});

test("failed character-table request can recover on retry", async ({ page }) => {
  let attempts = 0;
  await routeData(page, async ({ route, relativePath }) => {
    if (relativePath !== "characters.json") return false;
    attempts++;
    if (attempts === 1) {
      await route.fulfill({ status: 503, body: "temporarily unavailable" });
      return true;
    }
    return false;
  });
  await page.goto("./#/search");
  await page.locator(".search-input").fill("花");
  await expect(page.locator(".search-message")).toContainText("暂时无法加载");
  await page.locator('[data-action="submit"]').click();
  await expect(page.locator(".search-result .result-char")).toHaveText("花");
  expect(attempts).toBe(2);
});

test("search -> detail -> stroke-order writing", async ({ page }) => {
  await routeData(page);
  await page.goto("./#/search");
  await page.locator(".search-input").fill("花");
  await page.locator(".search-result").click();
  await expect(page.locator(".hero-char")).toHaveText("花");
  await page.locator('[data-action="strokes"]').click();
  await expect(page.locator(".strokes-status")).toContainText("一共");
  await expect(page.locator(".writer-target svg")).toBeVisible();
});

test("failed stroke pack can retry from the writing screen", async ({ page }) => {
  let failed = false;
  await routeData(page, async ({ route, relativePath }) => {
    if (!failed && relativePath.startsWith("strokes-packs/")) {
      failed = true;
      await route.fulfill({ status: 503, body: "temporarily unavailable" });
      return true;
    }
    return false;
  });
  await page.goto("./#/strokes/花");
  await expect(page.locator(".strokes-status")).toContainText("暂时无法加载");
  await page.locator('[data-action="retry"]').click();
  await expect(page.locator(".writer-target svg")).toBeVisible();
  expect(failed).toBe(true);
});

test("late detail requests cannot replace a newer home screen", async ({ page }) => {
  let release;
  let signalStarted;
  const started = new Promise(resolve => { signalStarted = resolve; });
  const held = new Promise(resolve => { release = resolve; });
  await routeData(page, async ({ relativePath, respond }) => {
    if (!relativePath.startsWith("strokes-packs/")) return false;
    signalStarted();
    await held;
    await respond();
    return true;
  });
  await page.goto("./#/search");
  await page.locator(".search-input").fill("花");
  await page.locator(".search-result").click();
  await started;
  await page.evaluate(() => { location.hash = "#/"; });
  await expect(page.locator(".app-title")).toHaveText("字");
  release();
  await page.waitForTimeout(350);
  await expect(page.locator(".app-title")).toHaveText("字");
  await expect(page.locator(".hero-char")).toHaveCount(0);
});

test("a cached page and visited character survive going offline", async ({ browser }) => {
  const context = await browser.newContext({ serviceWorkers: "allow" });
  const page = await context.newPage();
  try {
    // ?local-data uses existing JSON fixtures over the same origin. The
    // Service Worker is only installed on the first visit, so reload to take control.
    await page.goto("./?local-data");
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.reload();
    await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
    await page.locator('[data-nav="search"]').first().click();
    await page.locator(".search-input").fill("花");
    await page.locator(".search-result").click();
    await expect(page.locator(".hero-char")).toHaveText("花");
    await expect(page.locator('[data-action="strokes"]')).toBeVisible();
    await page.waitForFunction(async () => {
      return Boolean(await caches.match(new URL("./data/characters.json", location.href)));
    });

    await context.setOffline(true);
    await page.reload();
    await expect(page.locator(".hero-char")).toHaveText("花");
    await expect(page.locator('[data-action="strokes"]')).toBeVisible();
  } finally {
    await context.close();
  }
});
