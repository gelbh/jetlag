import { test, expect, openMapWithLocalSession } from "../../fixtures";

test("debug: check media query matching", async ({ page }) => {
  await page.setViewportSize({ width: 844, height: 390 });
  await openMapWithLocalSession(page);

  const vars = await page.evaluate(() => {
    const style = getComputedStyle(document.documentElement);
    const zoomStackHeight = style.getPropertyValue("--map-chrome-zoom-stack-height").trim();
    const dockIslandHeight = style.getPropertyValue("--dock-island-height").trim();
    const windowInfo = {
      innerHeight: window.innerHeight,
      innerWidth: window.innerWidth,
    };
    return {
      '--map-chrome-zoom-stack-height': zoomStackHeight,
      '--dock-island-height': dockIslandHeight,
      windowInfo,
      matchesLandscape: window.matchMedia("(orientation: landscape)").matches,
      matchesMaxHeight430: window.matchMedia("(max-height: 430px)").matches,
      matchesBoth: window.matchMedia("(max-height: 430px) and (orientation: landscape)").matches,
    };
  });

  console.log("CSS Variables:", JSON.stringify(vars, null, 2));
  expect(vars['--map-chrome-zoom-stack-height']).toBeDefined();
});
