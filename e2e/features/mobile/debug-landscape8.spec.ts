import { test, expect, openMapWithLocalSession } from "../../fixtures";

test("debug: check zoom control position", async ({ page }) => {
  await page.setViewportSize({ width: 844, height: 390 });
  await openMapWithLocalSession(page);
  await page.getByRole("button", { name: /Show map controls/i }).click();

  const metrics = await page.evaluate(() => {
    const side = document.querySelector(".jl-map-chrome-side-stack");
    const zoom = document.querySelector(".map-zoom-control");
    const sessionEl = side?.querySelector('[data-island="session"]');
    
    const sideRect = side?.getBoundingClientRect();
    const zoomRect = zoom?.getBoundingClientRect();
    const sessionRect = sessionEl?.getBoundingClientRect();

    return {
      side_top: sideRect?.top,
      side_bottom: sideRect?.bottom,
      session_top: sessionRect?.top,
      session_bottom: sessionRect?.bottom,
      zoom_top: zoomRect?.top,
      zoom_bottom: zoomRect?.bottom,
      overlap_start: Math.min((sideRect?.bottom as number), (zoomRect?.bottom as number)),
      overlap_end: Math.max((sideRect?.top as number), (zoomRect?.top as number)),
    };
  });

  console.log("ZOOM POSITION:", JSON.stringify(metrics, null, 2));
  expect(true).toBe(true);
});
