import { test, expect, openMapWithLocalSession } from "../../fixtures";

test("debug: full layout metrics in landscape", async ({ page }) => {
  await page.setViewportSize({ width: 844, height: 390 });
  await openMapWithLocalSession(page);
  await page.getByRole("button", { name: /Show map controls/i }).click();
  await expect(page.locator(".jl-tool-dock")).toBeVisible();

  const metrics = await page.evaluate(() => {
    const side = document.querySelector(".jl-map-chrome-side-stack") as HTMLElement;
    const dock = document.querySelector(".jl-tool-dock") as HTMLElement;
    const sideRect = side?.getBoundingClientRect();
    const dockRect = dock?.getBoundingClientRect();
    
    const style = getComputedStyle(document.documentElement);
    const allVars = {
      '--map-chrome-zoom-stack-height': style.getPropertyValue("--map-chrome-zoom-stack-height").trim(),
      '--dock-island-height': style.getPropertyValue("--dock-island-height").trim(),
      '--dock-height': style.getPropertyValue("--dock-height").trim(),
      '--dock-total-height': style.getPropertyValue("--dock-total-height").trim(),
    };

    return {
      vars: allVars,
      sideBottom: sideRect?.bottom,
      sideTop: sideRect?.top,
      sideHeight: sideRect?.height,
      dockTop: dockRect?.top,
      dockBottom: dockRect?.bottom,
      dockHeight: dockRect?.height,
      viewportHeight: window.innerHeight,
    };
  });

  console.log("METRICS:", JSON.stringify(metrics, null, 2));
  expect(true).toBe(true);
});
