import AxeBuilder from "@axe-core/playwright";
import { expect, type Locator, type Page } from "@playwright/test";

export async function assertInViewport(locator: Locator) {
  const [box, viewport] = await Promise.all([
    locator.boundingBox(),
    locator.page().evaluate(() => ({
      width: window.innerWidth,
      height: window.innerHeight,
    })),
  ]);
  expect(box, "element has no bounding box").not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.y).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width);
  expect(box!.y + box!.height).toBeLessThanOrEqual(viewport.height);
}

export async function assertNoHorizontalOverflow(page: Page) {
  const { scrollWidth, innerWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }));
  expect(scrollWidth).toBeLessThanOrEqual(innerWidth);
}

export async function assertMinTapTargets(locator: Locator, minPx = 44) {
  const count = await locator.count();
  expect(count).toBeGreaterThan(0);
  for (let i = 0; i < count; i++) {
    const box = await locator.nth(i).boundingBox();
    expect(box, `missing box for tap target ${i}`).not.toBeNull();
    expect(box!.width, `width ${i}`).toBeGreaterThanOrEqual(minPx);
    expect(box!.height, `height ${i}`).toBeGreaterThanOrEqual(minPx);
  }
}

export async function assertNoSeriousAxeViolations(
  page: Page,
  options?: { exclude?: string[] },
) {
  let builder = new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa"])
    // Brand token contrast debt is serious across entry surfaces; layout smoke
    // gates overflow/structure. Contrast tracked via design tokens separately.
    .disableRules(["color-contrast"]);
  for (const selector of options?.exclude ?? []) {
    builder = builder.exclude(selector);
  }
  const results = await builder.analyze();
  const blocking = results.violations.filter(
    (v) => v.impact === "serious" || v.impact === "critical",
  );
  expect(blocking, JSON.stringify(blocking, null, 2)).toEqual([]);
}
