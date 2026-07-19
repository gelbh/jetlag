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
    // 20rem ≈ 320px at default root; allow small padding slack
    expect(box!.width).toBeLessThanOrEqual(336);
  });
});
