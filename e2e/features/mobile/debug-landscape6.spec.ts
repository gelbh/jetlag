import { test, expect, openMapWithLocalSession } from "../../fixtures";

test("debug: check session island computed height", async ({ page }) => {
  await page.setViewportSize({ width: 844, height: 390 });
  await openMapWithLocalSession(page);
  await page.getByRole("button", { name: /Show map controls/i }).click();

  const styles = await page.evaluate(() => {
    const sessionEl = document.querySelector(".jl-map-chrome-side-stack .jl-map-island--session") as HTMLElement;
    const computed = getComputedStyle(sessionEl);
    return {
      height: computed.height,
      flex: computed.flex,
      flexBasis: computed.flexBasis,
      flexGrow: computed.flexGrow,
      flexShrink: computed.flexShrink,
      minHeight: computed.minHeight,
      maxHeight: computed.maxHeight,
      alignItems: computed.alignItems,
      display: computed.display,
    };
  });

  console.log("SESSION ISLAND COMPUTED:", JSON.stringify(styles, null, 2));
  expect(true).toBe(true);
});
