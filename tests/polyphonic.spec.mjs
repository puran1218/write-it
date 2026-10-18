import { test, expect } from "@playwright/test";

test("polyphonic entry groups pronunciation, meaning, and words", async ({ page }) => {
  await page.goto("./?local-data#/detail/缝");
  await expect(page.locator(".hero-char")).toHaveText("缝");
  await expect(page.locator(".polyphonic-tab")).toHaveCount(2);
  await expect(page.locator(".polyphonic-panel")).toContainText("针线");
  await expect(page.locator(".polyphonic-panel")).toContainText("缝补");
  await page.getByRole("tab", { name: "fèng" }).click();
  await expect(page.locator(".polyphonic-panel")).toContainText("空隙");
  await expect(page.locator(".polyphonic-panel")).toContainText("门缝");
  await expect(page.getByRole("tab", { name: "fèng" })).toHaveAttribute("aria-selected", "true");
  await expect(page.locator('[data-action="strokes"]')).toBeVisible();
});

test("tone-specific search preselects each correct reading", async ({ page }) => {
  for (const [query, reading, meaning] of [
    ["feng2", "féng", "针线"],
    ["feng4", "fèng", "空隙"]
  ]) {
    await page.goto("./?local-data#/search");
    await page.locator(".search-input").fill(query);
    const result = page.locator(".search-result").filter({ hasText: "缝" });
    await expect(result).toBeVisible();
    await expect(result.locator(".result-pinyin")).toHaveText(reading);
    await result.click();
    await expect(page.getByRole("tab", { name: reading })).toHaveAttribute("aria-selected", "true");
    await expect(page.locator(".polyphonic-panel")).toContainText(meaning);
  }
});

test("both chang and zhang find the same character, with matching readings", async ({ page }) => {
  for (const [query, reading] of [["chang", "cháng"], ["zhang", "zhǎng"]]) {
    await page.goto("./?local-data#/search");
    await page.locator(".search-input").fill(query);
    const result = page.locator(".search-result").filter({ hasText: "长" });
    await expect(result).toBeVisible();
    await expect(result.locator(".result-pinyin")).toHaveText(reading);
  }
});

test("unreviewed candidates and single-reading characters keep the old view", async ({ page }) => {
  await page.goto("./?local-data#/detail/好");
  await expect(page.locator(".polyphonic-tab")).toHaveCount(0);
  await expect(page.locator(".hero-pinyin")).toHaveText("hǎo");
  await page.goto("./?local-data#/detail/花");
  await expect(page.locator(".polyphonic-tab")).toHaveCount(0);
  await expect(page.locator('[data-action="strokes"]')).toBeVisible();
});

test("direct character search lists the two readings without downloading stroke packs", async ({ page }) => {
  const requested = [];
  page.on("request", request => requested.push(request.url()));
  await page.goto("./?local-data#/search");
  await page.locator(".search-input").fill("缝");
  await expect(page.locator(".search-result")).toHaveCount(1);
  await expect(page.locator(".result-pinyin")).toContainText("féng · fèng");
  expect(requested.some(url => url.includes("strokes-packs/"))).toBe(false);
});
