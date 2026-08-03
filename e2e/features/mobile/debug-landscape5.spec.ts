import { test, expect, openMapWithLocalSession } from "../../fixtures";

test("debug: check side stack contents", async ({ page }) => {
  await page.setViewportSize({ width: 844, height: 390 });
  await openMapWithLocalSession(page);
  await page.getByRole("button", { name: /Show map controls/i }).click();

  const content = await page.evaluate(() => {
    const side = document.querySelector(".jl-map-chrome-side-stack") as HTMLElement;
    const children = Array.from(side?.children || []).map(el => {
      const rect = (el as HTMLElement).getBoundingClientRect();
      return {
        class: (el as HTMLElement).className,
        tag: el.tagName,
        height: rect.height,
        top: rect.top,
        bottom: rect.bottom,
      };
    });
    return {
      sideStackChildCount: children.length,
      children,
      side: {
        top: side.getBoundingClientRect().top,
        bottom: side.getBoundingClientRect().bottom,
        height: side.getBoundingClientRect().height,
      },
    };
  });

  console.log("SIDE STACK CONTENT:", JSON.stringify(content, null, 2));
  expect(true).toBe(true);
});
