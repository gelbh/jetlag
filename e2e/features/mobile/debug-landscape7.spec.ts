import { test, expect, openMapWithLocalSession } from "../../fixtures";

test("debug: check tool-dock-group-secondary flex", async ({ page }) => {
  await page.setViewportSize({ width: 844, height: 390 });
  await openMapWithLocalSession(page);
  await page.getByRole("button", { name: /Show map controls/i }).click();

  const computed = await page.evaluate(() => {
    const groupEl = document.querySelector(".jl-map-chrome-side-stack .jl-map-island .jl-tool-dock-group-secondary") as HTMLElement;
    const style = getComputedStyle(groupEl);
    return {
      flex: style.flex,
      flexGrow: style.flexGrow,
      flexShrink: style.flexShrink,
      flexBasis: style.flexBasis,
      height: style.height,
    };
  });

  console.log("GROUP FLEX:", JSON.stringify(computed, null, 2));
  expect(true).toBe(true);
});
