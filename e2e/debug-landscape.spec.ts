import { test, expect, openMapWithLocalSession } from "./fixtures";

test("debug landscape zoom clearance", async ({ page }) => {
  // Short landscape
  await page.setViewportSize({ width: 844, height: 390 });
  await openMapWithLocalSession(page);
  await page.getByRole("button", { name: /Show map controls/i }).click();
  await expect(page.locator(".jl-tool-dock")).toBeVisible();

  const metrics = await page.evaluate(() => {
    const side = document.querySelector(".jl-map-chrome-side-stack");
    const zoom = document.querySelector(".map-zoom-control");
    const sessionEl = side?.querySelector('[data-island="session"]');
    const dock = document.querySelector(".jl-tool-dock");
    
    if (!side || !zoom || !sessionEl || !dock) {
      return { error: "Missing elements" };
    }

    const sideRect = side.getBoundingClientRect();
    const zoomRect = zoom.getBoundingClientRect();
    const sessionRect = sessionEl.getBoundingClientRect();
    const dockRect = dock.getBoundingClientRect();
    
    const style = getComputedStyle(document.documentElement);
    const zoomStackHeight = style.getPropertyValue("--map-chrome-zoom-stack-height").trim();
    const dockIslandHeight = style.getPropertyValue("--dock-island-height").trim();

    return {
      viewportHeight: window.innerHeight,
      side_top: sideRect.top,
      side_bottom: sideRect.bottom,
      side_height: sideRect.height,
      session_top: sessionRect.top,
      session_bottom: sessionRect.bottom,
      zoom_top: zoomRect.top,
      zoom_bottom: zoomRect.bottom,
      dock_top: dockRect.top,
      dock_bottom: dockRect.bottom,
      dock_height: dockRect.height,
      zoomStackHeightVar: zoomStackHeight,
      dockIslandHeightVar: dockIslandHeight,
    };
  });

  console.log(JSON.stringify(metrics, null, 2));
  expect(metrics.side_top).toBeGreaterThanOrEqual(-1);
});
