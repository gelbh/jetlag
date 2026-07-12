import {
  test,
  expect,
  expectCreatePageMapPreviewLoaded,
  prepareE2EPage,
} from "../fixtures";

test.describe("create session screenshots", () => {
  test("@smoke matches play area HUD after place search", async ({ page }) => {
    await prepareE2EPage(page);
    await page.goto("/create");
    await page.getByPlaceholder("Dublin, Ireland").fill("Dublin");
    await page.getByRole("button", { name: "Find place" }).click();
    await expect(page.getByText(/sq mi play area/i).first()).toBeVisible({
      timeout: 10_000,
    });
    await expectCreatePageMapPreviewLoaded(page);

    const hudPanel = page.locator(".hud-panel").filter({
      hasText: /sq mi play area/i,
    });
    await expect(hudPanel).toHaveScreenshot("create-hud.png");
  });
});
