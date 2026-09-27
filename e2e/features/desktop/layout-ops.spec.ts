import {
  test,
  expect,
  prepareE2EPage,
  openPlayHub,
  openMapWithLocalSession,
  openSettings,
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
    // Tip home CTAs sit under a wider poster column (~24rem); keep a soft ceiling.
    expect(box!.width).toBeLessThanOrEqual(400);
  });

  test("@smoke social column ≤36rem on /stats", async ({ page }) => {
    await prepareE2EPage(page);
    await page.goto("/stats");
    const main = page.locator("main .mantine-Container-root").first();
    await expect(main).toBeVisible();
    const box = await main.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeLessThanOrEqual(576 + 8); // 36rem
  });

  test("@smoke ops shell has tool nav and no bottom dock", async ({ page }) => {
    await openMapWithLocalSession(page);
    const toolsNav = page.getByRole("navigation", { name: /Map tools/i });
    await expect(toolsNav).toBeVisible();
    await expect(
      page.getByRole("region", { name: "Map status" }),
    ).toBeVisible();

    const box = await toolsNav.boundingBox();
    expect(box).not.toBeNull();
    // Left rail: narrow column on the left edge (not a full-width bottom dock).
    expect(box!.x).toBeLessThan(120);
    expect(box!.width).toBeLessThanOrEqual(120);
    expect(box!.height).toBeGreaterThan(box!.width);
  });

  test("@smoke settings opens in contextual rail not bottom sheet", async ({
    page,
  }) => {
    await openMapWithLocalSession(page);
    await openSettings(page);
    await expect(
      page.getByRole("complementary", { name: /Map panels/i }),
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
    await expect(page.getByRole("dialog", { name: "Settings" })).toBeVisible();
    // Tip desktop: settings live in the ops complementary rail, not a mobile sheet.
    await expect(page.locator(".hud-sheet.fixed")).toHaveCount(0);
  });
});
