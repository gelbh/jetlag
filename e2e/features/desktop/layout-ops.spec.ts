import { test, expect, prepareE2EPage, openPlayHub } from "../../fixtures";

test.describe("desktop layout @ 1280", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test("@smoke home CTAs stay ≤20rem", async ({ page }) => {
    await prepareE2EPage(page);
    await page.goto("/");
    await openPlayHub(page);
    const join = page.getByRole("link", { name: /Join session/i });
    await expect(join).toBeVisible();
    const box = await join.boundingBox();
    expect(box).not.toBeNull();
    // 20rem = 320px at default root font-size
    expect(box!.width).toBeLessThanOrEqual(320);
  });

  test("@smoke social column ≤36rem on /stats", async ({ page }) => {
    await prepareE2EPage(page);
    await page.goto("/stats");
    const main = page.locator("main .mx-auto").first();
    await expect(main).toBeVisible();
    const box = await main.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeLessThanOrEqual(576 + 8); // 36rem
  });
});
