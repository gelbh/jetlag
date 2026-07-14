import {
  test,
  expect,
  openMapWithLocalSession,
  placePin,
  prepareE2EPage,
  readToolDockOverflowMetrics,
  injectSimulatedSafeAreaBottom,
  SIMULATED_SAFE_AREA_BOTTOM_PX,
} from "../../fixtures";

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
    const metrics = await readToolDockOverflowMetrics(page);

    expect(metrics.overflowSlots).toBe(0);
    expect(metrics.barRight).toBeLessThanOrEqual(metrics.viewportWidth);
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
    const metrics = await readToolDockOverflowMetrics(page);

    expect(metrics.overflowSlots).toBe(0);
    expect(metrics.barRight).toBeLessThanOrEqual(metrics.viewportWidth);
  });
});

test.describe("iPhone 13 PWA safe area", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openMapWithLocalSession(page);
    await injectSimulatedSafeAreaBottom(page, SIMULATED_SAFE_AREA_BOTTOM_PX);
  });

  test("dock floats above home indicator with map full bleed", async ({
    page,
  }) => {
    const metrics = await page.evaluate(() => {
      const dock = document.querySelector(".jl-tool-dock");
      const bar = document.querySelector(".jl-tool-dock-bar");
      const map = document.querySelector(".leaflet-container");
      const topBand = document.querySelector(".map-screen-shell");
      const dockRect = dock?.getBoundingClientRect();
      const barRect = bar?.getBoundingClientRect();
      const mapRect = map?.getBoundingClientRect();
      const topBandStyle = topBand
        ? getComputedStyle(topBand, "::before")
        : null;
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
        mapBottom: mapRect?.bottom ?? 0,
        topBandHeight: topBandStyle
          ? Number.parseFloat(topBandStyle.height)
          : 0,
        dockPaddingBottom: dock
          ? Number.parseFloat(getComputedStyle(dock).paddingBottom)
          : 0,
        dockBottomOffset: dock
          ? Number.parseFloat(getComputedStyle(dock).bottom)
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
        backdropOnMap: document.querySelector(".app-entry-backdrop"),
      };
    });

    expect(metrics.backdropOnMap).toBeNull();
    expect(metrics.dockPaddingBottom).toBeLessThanOrEqual(1);
    expect(metrics.dockBottomOffset).toBeGreaterThanOrEqual(
      SIMULATED_SAFE_AREA_BOTTOM_PX - 2,
    );
    expect(metrics.barPaddingBottom).toBeLessThanOrEqual(6);
    expect(
      Math.abs(
        metrics.dockBottom -
          (metrics.viewportHeight - SIMULATED_SAFE_AREA_BOTTOM_PX),
      ),
    ).toBeLessThanOrEqual(4);
    expect(metrics.gapBelowDock).toBeGreaterThanOrEqual(
      SIMULATED_SAFE_AREA_BOTTOM_PX - 4,
    );
    expect(Math.abs(metrics.mapBottom - metrics.viewportHeight)).toBeLessThanOrEqual(
      2,
    );
    expect(metrics.barHeight).toBeLessThanOrEqual(60);
    expect(metrics.deadSpaceBelowIcons).toBeLessThanOrEqual(8);
  });
});

test.describe("iPhone 13 PWA home safe area", () => {
  test.beforeEach(async ({ page }) => {
    await prepareE2EPage(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await expect(
      page.getByRole("button", { name: /Play — create, join, or custom game/i }),
    ).toBeVisible();
    await injectSimulatedSafeAreaBottom(page, SIMULATED_SAFE_AREA_BOTTOM_PX);
  });

  test("global entry backdrop covers the viewport", async ({ page }) => {
    const metrics = await page.evaluate(() => {
      const poster = document.querySelector(".home-poster");
      const posterRect = poster?.getBoundingClientRect();
      const backdrop = document.querySelector(".app-entry-backdrop");
      const backdropStyle = backdrop ? getComputedStyle(backdrop) : null;
      const bodyBg = getComputedStyle(document.body).backgroundColor;
      return {
        viewportHeight: window.innerHeight,
        posterBottom: posterRect?.bottom ?? 0,
        backdropPosition: backdropStyle?.position ?? "",
        backdropTop: backdropStyle?.top ?? "",
        backdropBottom: backdropStyle?.bottom ?? "",
        backdropBackgroundImage: backdropStyle?.backgroundImage ?? "",
        bodyBg,
      };
    });

    expect(metrics.posterBottom).toBeGreaterThanOrEqual(metrics.viewportHeight - 2);
    expect(metrics.backdropPosition).toBe("fixed");
    expect(metrics.backdropTop).toBe("0px");
    expect(metrics.backdropBottom).toBe("0px");
    expect(metrics.backdropBackgroundImage).not.toBe("none");
    expect(metrics.bodyBg).not.toBe("rgba(0, 0, 0, 0)");
  });
});

test.describe("iPhone 13 PWA join safe area", () => {
  test.beforeEach(async ({ page }) => {
    await prepareE2EPage(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/join");
    await expect(page.getByRole("heading", { name: "Session code" })).toBeVisible();
    await injectSimulatedSafeAreaBottom(page, SIMULATED_SAFE_AREA_BOTTOM_PX);
  });

  test("join screen keeps gradient backdrop in safe area band", async ({ page }) => {
    const metrics = await page.evaluate(() => {
      const backdrop = document.querySelector(".app-entry-backdrop");
      const backdropStyle = backdrop ? getComputedStyle(backdrop) : null;
      return {
        backdropExists: !!backdrop,
        backdropPosition: backdropStyle?.position ?? "",
        backdropTop: backdropStyle?.top ?? "",
        backdropBottom: backdropStyle?.bottom ?? "",
        backdropBackgroundImage: backdropStyle?.backgroundImage ?? "",
      };
    });

    expect(metrics.backdropExists).toBe(true);
    expect(metrics.backdropPosition).toBe("fixed");
    expect(metrics.backdropTop).toBe("0px");
    expect(metrics.backdropBottom).toBe("0px");
    expect(metrics.backdropBackgroundImage).not.toBe("none");
  });
});
