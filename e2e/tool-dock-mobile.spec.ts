import { test, expect } from "./fixtures";
import { openMapWithLocalSession, placePin } from "./fixtures";

test.describe("mobile tool dock", () => {
  test.beforeEach(async ({ page }) => {
    await openMapWithLocalSession(page);
  });

  test("hides undo in the dock and exposes it in the overflow sheet", async ({
    page,
  }) => {
    const historyGroup = page.getByLabel("History");
    await expect(historyGroup).toBeHidden();

    await page.getByRole("button", { name: "More tools" }).click();
    const sheet = page.getByRole("dialog", { name: "More tools" });
    await expect(sheet).toBeVisible();
    await expect(
      sheet.getByRole("button", { name: "Undo last annotation" }),
    ).toBeVisible();
    await expect(sheet.getByRole("button", { name: "Redo last annotation" })).toBeVisible();
    await expect(sheet.getByText("Draw a play boundary")).toBeVisible();
    await expect(sheet.getByRole("button", { name: "Open settings" })).toBeVisible();
  });

  test("dock fits without clipping question tools", async ({ page }) => {
    const metrics = await page.evaluate(() => {
      const bar = document.querySelector(".jl-tool-dock-bar");
      const barRect = bar?.getBoundingClientRect();
      const slots = [...document.querySelectorAll(".jl-tool-slot")].filter(
        (el) => el.getBoundingClientRect().width > 0,
      );
      return {
        barRight: barRect?.right ?? 0,
        viewportWidth: window.innerWidth,
        overflowSlots: slots.filter((el) => {
          const rect = el.getBoundingClientRect();
          return rect.right > (barRect?.right ?? 0) + 1;
        }).length,
      };
    });

    expect(metrics.overflowSlots).toBe(0);
    expect(metrics.barRight).toBeLessThanOrEqual(metrics.viewportWidth);
  });

  test("matches compact dock screenshots", async ({ page }) => {
    await expect(page.locator(".jl-tool-dock-bar")).toHaveScreenshot(
      "tool-dock-compact-closed.png",
    );

    await page.getByRole("button", { name: "More tools" }).click();
    await expect(page.getByRole("dialog", { name: "More tools" })).toHaveScreenshot(
      "tool-overflow-sheet-open.png",
    );
  });

  test("supports undo from the overflow sheet after placing a pin", async ({
    page,
  }) => {
    await placePin(page);
    await page.getByRole("button", { name: "More tools" }).click();
    await page
      .getByRole("dialog", { name: "More tools" })
      .getByRole("button", { name: "Undo last annotation" })
      .click();

    await page.getByRole("button", { name: "More tools" }).click();
    await expect(
      page
        .getByRole("dialog", { name: "More tools" })
        .getByRole("button", { name: "Redo last annotation" }),
    ).toBeEnabled();
  });
});

test.describe("iPhone 14 Pro Max tool dock", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 430, height: 932 });
    await openMapWithLocalSession(page);
  });

  test("renders a single dock bar without a stacked duplicate", async ({ page }) => {
    await expect(page.locator(".jl-tool-dock-bar")).toHaveCount(1);

    const metrics = await page.evaluate(() => {
      const bars = [...document.querySelectorAll(".jl-tool-dock-bar")];
      const dock = document.querySelector(".jl-tool-dock");
      const dockRect = dock?.getBoundingClientRect();
      const barRect = bars[0]?.getBoundingClientRect();
      return {
        barCount: bars.length,
        viewportHeight: window.innerHeight,
        barBottom: barRect?.bottom ?? 0,
        dockBottom: dockRect?.bottom ?? 0,
      };
    });

    expect(metrics.barCount).toBe(1);
    expect(metrics.barBottom).toBeLessThanOrEqual(metrics.viewportHeight + 1);
    expect(metrics.dockBottom).toBeLessThanOrEqual(metrics.viewportHeight + 1);
  });

  test("dock fits without clipping question tools at 430px", async ({ page }) => {
    const metrics = await page.evaluate(() => {
      const bar = document.querySelector(".jl-tool-dock-bar");
      const barRect = bar?.getBoundingClientRect();
      const slots = [...document.querySelectorAll(".jl-tool-slot")].filter(
        (el) => el.getBoundingClientRect().width > 0,
      );
      return {
        barRight: barRect?.right ?? 0,
        viewportWidth: window.innerWidth,
        overflowSlots: slots.filter((el) => {
          const rect = el.getBoundingClientRect();
          return rect.right > (barRect?.right ?? 0) + 1;
        }).length,
      };
    });

    expect(metrics.overflowSlots).toBe(0);
    expect(metrics.barRight).toBeLessThanOrEqual(metrics.viewportWidth);
  });

  test("matches compact dock screenshots at 430px", async ({ page }) => {
    await expect(page.locator(".jl-tool-dock-bar")).toHaveScreenshot(
      "tool-dock-compact-14-pro-max.png",
    );
  });
});

const SIMULATED_SAFE_AREA_BOTTOM_PX = 34;

test.describe("iPhone 13 PWA safe area", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openMapWithLocalSession(page);
    await page.evaluate((safeBottomPx) => {
      document.documentElement.style.setProperty(
        "--safe-area-bottom",
        `${safeBottomPx}px`,
      );
    }, SIMULATED_SAFE_AREA_BOTTOM_PX);
  });

  test("dock wrapper extends to viewport bottom with transparent safe-area band below bar", async ({
    page,
  }) => {
    const metrics = await page.evaluate(() => {
      const dock = document.querySelector(".jl-tool-dock");
      const bar = document.querySelector(".jl-tool-dock-bar");
      const dockRect = dock?.getBoundingClientRect();
      const barRect = bar?.getBoundingClientRect();
      const slots = [...document.querySelectorAll(".jl-tool-slot")].filter(
        (el) => el.getBoundingClientRect().width > 0,
      );
      const lowestSlotBottom = Math.max(
        ...slots.map((el) => el.getBoundingClientRect().bottom),
        0,
      );
      return {
        viewportHeight: window.innerHeight,
        dockBottom: dockRect?.bottom ?? 0,
        barHeight: barRect?.height ?? 0,
        barBottom: barRect?.bottom ?? 0,
        wrapperBandHeight: (dockRect?.bottom ?? 0) - (barRect?.bottom ?? 0),
        dockPaddingBottom: dock
          ? Number.parseFloat(getComputedStyle(dock).paddingBottom)
          : 0,
        barPaddingBottom: bar
          ? Number.parseFloat(getComputedStyle(bar).paddingBottom)
          : 0,
        lowestSlotBottom,
        gapBelowDock: window.innerHeight - (dockRect?.bottom ?? 0),
        deadSpaceBelowIcons:
          (barRect?.bottom ?? 0) -
          lowestSlotBottom -
          (bar
            ? Number.parseFloat(getComputedStyle(bar).paddingBottom)
            : 0),
      };
    });

    expect(metrics.dockPaddingBottom).toBeGreaterThanOrEqual(
      SIMULATED_SAFE_AREA_BOTTOM_PX - 2,
    );
    expect(metrics.barPaddingBottom).toBeLessThanOrEqual(6);
    expect(metrics.gapBelowDock).toBeLessThanOrEqual(1);
    expect(Math.abs(metrics.dockBottom - metrics.viewportHeight)).toBeLessThanOrEqual(
      1,
    );
    expect(
      Math.abs(
        metrics.barBottom -
          (metrics.viewportHeight - SIMULATED_SAFE_AREA_BOTTOM_PX),
      ),
    ).toBeLessThanOrEqual(4);
    expect(metrics.wrapperBandHeight).toBeGreaterThanOrEqual(
      SIMULATED_SAFE_AREA_BOTTOM_PX - 4,
    );
    expect(metrics.wrapperBandHeight).toBeLessThanOrEqual(
      SIMULATED_SAFE_AREA_BOTTOM_PX + 4,
    );
    expect(metrics.barHeight).toBeLessThanOrEqual(60);
    expect(metrics.deadSpaceBelowIcons).toBeLessThanOrEqual(8);
  });

  test("matches compact dock screenshot with safe area", async ({ page }) => {
    await expect(page.locator(".jl-tool-dock-bar")).toHaveScreenshot(
      "tool-dock-compact-iphone13-safe-area.png",
    );
  });
});

test.describe("iPhone 13 PWA home safe area", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await page.evaluate((safeBottomPx) => {
      document.documentElement.style.setProperty(
        "--safe-area-bottom",
        `${safeBottomPx}px`,
      );
    }, SIMULATED_SAFE_AREA_BOTTOM_PX);
  });

  test("home poster fills viewport without gap below content", async ({ page }) => {
    const metrics = await page.evaluate(() => {
      const poster = document.querySelector(".home-poster");
      const posterRect = poster?.getBoundingClientRect();
      const bodyBg = getComputedStyle(document.body).backgroundColor;
      return {
        viewportHeight: window.innerHeight,
        posterBottom: posterRect?.bottom ?? 0,
        bodyBg,
      };
    });

    expect(metrics.posterBottom).toBeGreaterThanOrEqual(metrics.viewportHeight - 2);
    expect(metrics.bodyBg).not.toBe("rgba(0, 0, 0, 0)");
  });
});
