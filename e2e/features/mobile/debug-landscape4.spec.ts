import { test, expect, openMapWithLocalSession } from "../../fixtures";

test("debug: check side stack computed styles", async ({ page }) => {
  await page.setViewportSize({ width: 844, height: 390 });
  await openMapWithLocalSession(page);
  await page.getByRole("button", { name: /Show map controls/i }).click();

  const styles = await page.evaluate(() => {
    const side = document.querySelector(".jl-map-chrome-side-stack") as HTMLElement;
    const computed = getComputedStyle(side);
    return {
      position: computed.position,
      bottom: computed.bottom,
      top: computed.top,
      right: computed.right,
      zIndex: computed.zIndex,
    };
  });

  console.log("SIDE STACK STYLES:", JSON.stringify(styles, null, 2));
  expect(true).toBe(true);
});
