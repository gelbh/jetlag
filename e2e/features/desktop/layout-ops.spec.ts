import {
  test,
  expect,
  prepareE2EPage,
  openPlayHub,
  openMapWithLocalSession,
} from "../../fixtures";

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

  test("@smoke ops shell has tool nav and no bottom dock", async ({ page }) => {
    await openMapWithLocalSession(page);
    await expect(
      page.getByRole("navigation", { name: /Map tools/i }),
    ).toBeVisible();
    await expect(page.locator(".desktop-ops-shell")).toBeVisible();
    const dock = page.locator(".jl-tool-dock");
    await expect(dock).toBeVisible();
    const box = await dock.boundingBox();
    expect(box).not.toBeNull();
    const vh = page.viewportSize()!.height;
    // Rail sits on the left; bottom edge must not hug the viewport bottom.
    expect(box!.y + box!.height).toBeLessThan(vh - 80);
    expect(box!.x).toBeLessThan(120);
  });
});
