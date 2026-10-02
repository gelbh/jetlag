import { expect, openMapWithLocalSession, prepareE2EPage, test } from "../../fixtures";

test.describe("phone shell @ 1280", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test("@smoke player shell max width 440", async ({ page }) => {
    await prepareE2EPage(page);
    await page.goto("/");
    const shell = page.getByTestId("player-phone-shell");
    await expect(shell).toBeVisible();
    const box = await shell.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThanOrEqual(430);
    expect(box!.width).toBeLessThanOrEqual(440 + 1);
  });

  test("@smoke shell fills phone viewport up to max", async ({ page }) => {
    await page.setViewportSize({ width: 440, height: 956 });
    await prepareE2EPage(page);
    await page.goto("/");
    const box = await page.getByTestId("player-phone-shell").boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThan(430);
    expect(box!.width).toBeLessThanOrEqual(440 + 1);
  });

  test("@smoke map uses bottom dock not ops shell", async ({ page }) => {
    await openMapWithLocalSession(page);
    await expect(page.locator(".desktop-ops-shell")).toHaveCount(0);
    await expect(page.getByRole("group", { name: /Hunt tools/i })).toBeVisible();
    const dock = page.locator(".jl-tool-dock").first();
    await expect(dock).toBeVisible();
    await expect(page.locator(".jl-tool-dock--rail")).toHaveCount(0);
    const box = await dock.boundingBox();
    expect(box).not.toBeNull();
    const viewport = page.viewportSize();
    expect(viewport).not.toBeNull();
    expect(box!.x).toBeGreaterThan(120);
    expect(box!.y + box!.height).toBeGreaterThan(viewport!.height * 0.7);
    expect(box!.width).toBeGreaterThan(box!.height);
  });

  test("@smoke admin stays outside phone shell", async ({ page }) => {
    // /admin is outside PlayerPhoneShell. No admin auth fixture in e2e;
    // unsigned desk/sign-in gate is enough to assert the route is unwrapped.
    await prepareE2EPage(page);
    await page.goto("/admin");
    await expect(page.getByTestId("player-phone-shell")).toHaveCount(0);
  });
});
