import {
  test,
  expect,
  openMapWithLocalSession,
  placePin,
  prepareE2EPage,
  readToolDockOverflowMetrics,
  readVisibleToolDockLabelMetrics,
  injectSimulatedSafeAreaBottom,
  injectSimulatedSafeAreaTop,
  injectStandaloneDisplayMode,
  SIMULATED_SAFE_AREA_BOTTOM_PX,
  SIMULATED_SAFE_AREA_TOP_PX,
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
    await expect(
      sheet.getByRole("button", { name: "Open settings" }),
    ).toHaveCount(0);
    await expect(
      sheet.getByRole("button", { name: "Open chat" }),
    ).toHaveCount(0);

    const sessionTools = page.getByLabel("Session tools");
    await expect(sessionTools).toBeVisible();
    await expect(
      sessionTools.getByRole("button", { name: "Open settings" }),
    ).toBeVisible();
    await expect(
      sessionTools.getByRole("button", { name: /^Open chat/ }),
    ).toBeVisible();
    await expect(
      sessionTools.getByRole("button", { name: "Report a problem" }),
    ).toBeVisible();
    await sessionTools.getByRole("button", { name: "Report a problem" }).click();
    await expect(
      page.getByRole("dialog", { name: "Report problem" }),
    ).toBeVisible();

    const barCount = await page.locator(".jl-tool-dock-bar").count();
    expect(barCount).toBe(2);
  });

  test("dock fits without clipping question tools", async ({ page }) => {
    const metrics = await readToolDockOverflowMetrics(page);

    expect(metrics.overflowSlots).toBe(0);
    expect(metrics.barRight).toBeLessThanOrEqual(metrics.viewportWidth);
  });

  test("shows short labels on every visible dock slot at 320px", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    await openMapWithLocalSession(page);

    const labels = await readVisibleToolDockLabelMetrics(page);

    expect(labels.length).toBeGreaterThan(0);
    for (const label of labels) {
      expect(label.display).not.toBe("none");
      expect(label.text.length).toBeGreaterThan(0);
      expect(label.slotHeight).toBeGreaterThanOrEqual(43);
    }
    expect(labels.some((label) => label.text === "Match")).toBe(true);
    expect(labels.some((label) => label.text === "More")).toBe(true);
  });

  test("shows short labels on every visible dock slot at 390px", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openMapWithLocalSession(page);

    const labels = await readVisibleToolDockLabelMetrics(page);

    expect(labels.length).toBeGreaterThan(0);
    for (const label of labels) {
      expect(label.display).not.toBe("none");
      expect(label.text.length).toBeGreaterThan(0);
    }
    expect(labels.some((label) => label.text === "Measure")).toBe(true);
    expect(labels.some((label) => label.text === "More")).toBe(true);
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

  test("renders primary and secondary dock bars without a duplicate stack", async ({ page }) => {
    await expect(page.locator(".jl-tool-dock-bar")).toHaveCount(2);

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

    expect(metrics.barCount).toBe(2);
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

  test("dock flush chassis absorbs home indicator with map full bleed", async ({
    page,
  }) => {
    const metrics = await page.evaluate(() => {
      const dock = document.querySelector(".jl-tool-dock");
      const bar = document.querySelector(".jl-tool-dock-bar");
      const map = document.querySelector(".leaflet-container");
      const dockRect = dock?.getBoundingClientRect();
      const barRect = bar?.getBoundingClientRect();
      const mapRect = map?.getBoundingClientRect();
      const slots = [...document.querySelectorAll(".jl-tool-slot")].filter(
        (el) => el.getBoundingClientRect().width > 0,
      );
      const lowestSlotBottom = Math.max(
        ...slots.map((el) => el.getBoundingClientRect().bottom),
        0,
      );
      const dockStyle = dock ? getComputedStyle(dock) : null;
      const barStyle = bar ? getComputedStyle(bar) : null;
      return {
        viewportHeight: window.innerHeight,
        dockBottom: dockRect?.bottom ?? 0,
        barHeight: barRect?.height ?? 0,
        barBottom: barRect?.bottom ?? 0,
        mapBottom: mapRect?.bottom ?? 0,
        dockPaddingBottom: dockStyle
          ? Number.parseFloat(dockStyle.paddingBottom)
          : 0,
        dockBottomOffset: dockStyle
          ? Number.parseFloat(dockStyle.bottom)
          : 0,
        barPaddingBottom: barStyle
          ? Number.parseFloat(barStyle.paddingBottom)
          : 0,
        lowestSlotBottom,
        gapBelowDock: window.innerHeight - (dockRect?.bottom ?? 0),
        deadSpaceBelowIcons:
          (barRect?.bottom ?? 0) -
          lowestSlotBottom -
          (barStyle ? Number.parseFloat(barStyle.paddingBottom) : 0),
        barCount: document.querySelectorAll(".jl-tool-dock-bar").length,
        backdropOnMap: document.querySelector(".app-entry-backdrop"),
      };
    });

    expect(metrics.backdropOnMap).toBeNull();
    expect(metrics.barCount).toBe(2);
    // Wrapper chassis: flush to physical bottom, pad absorbs safe-area.
    expect(metrics.dockBottomOffset).toBeLessThanOrEqual(1);
    expect(metrics.gapBelowDock).toBeLessThanOrEqual(2);
    expect(
      Math.abs(metrics.dockBottom - metrics.viewportHeight),
    ).toBeLessThanOrEqual(2);
    expect(metrics.dockPaddingBottom).toBeGreaterThanOrEqual(
      SIMULATED_SAFE_AREA_BOTTOM_PX - 2,
    );
    // Forbidden: safe-area pad inside the bordered bar (reverted stripe).
    expect(metrics.barPaddingBottom).toBeLessThanOrEqual(6);
    expect(Math.abs(metrics.mapBottom - metrics.viewportHeight)).toBeLessThanOrEqual(
      2,
    );
    expect(metrics.barHeight).toBeLessThanOrEqual(64);
    expect(metrics.deadSpaceBelowIcons).toBeLessThanOrEqual(8);
  });

  test("standalone display-mode keeps flush dock chassis with home indicator", async ({
    page,
  }) => {
    await injectStandaloneDisplayMode(page);
    await page.reload();
    await expect(page.locator(".jl-tool-dock")).toBeVisible();
    await injectSimulatedSafeAreaBottom(page, SIMULATED_SAFE_AREA_BOTTOM_PX);

    const metrics = await page.evaluate(() => {
      const dock = document.querySelector(".jl-tool-dock");
      const dockRect = dock?.getBoundingClientRect();
      const dockStyle = dock ? getComputedStyle(dock) : null;
      return {
        viewportHeight: window.innerHeight,
        dockBottom: dockRect?.bottom ?? 0,
        dockPaddingBottom: dockStyle
          ? Number.parseFloat(dockStyle.paddingBottom)
          : 0,
      };
    });

    expect(Math.abs(metrics.dockBottom - metrics.viewportHeight)).toBeLessThanOrEqual(
      2,
    );
    expect(metrics.dockPaddingBottom).toBeGreaterThanOrEqual(
      SIMULATED_SAFE_AREA_BOTTOM_PX - 2,
    );
  });

  test("status bar clears the notch safe-area band", async ({ page }) => {
    await injectSimulatedSafeAreaTop(page, SIMULATED_SAFE_AREA_TOP_PX);

    const metrics = await page.evaluate(() => {
      const rail = document.querySelector(".jl-status-rail");
      const bar = document.querySelector(".jl-status-bar");
      const railRect = rail?.getBoundingClientRect();
      const barRect = bar?.getBoundingClientRect();
      return {
        railPaddingTop: rail
          ? Number.parseFloat(getComputedStyle(rail).paddingTop)
          : 0,
        barTop: barRect?.top ?? 0,
        railTop: railRect?.top ?? 0,
      };
    });

    expect(metrics.railPaddingTop).toBeGreaterThanOrEqual(
      SIMULATED_SAFE_AREA_TOP_PX - 1,
    );
    expect(metrics.barTop).toBeGreaterThanOrEqual(
      SIMULATED_SAFE_AREA_TOP_PX - 1,
    );
    expect(metrics.railTop).toBeLessThanOrEqual(1);
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

test.describe("landscape map-dominant chrome", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 844, height: 390 });
    await openMapWithLocalSession(page);
  });

  test("collapses the dock by default and reveals it from the chip", async ({
    page,
  }) => {
    const dockBar = page.locator(".jl-tool-dock-bar");
    await expect(dockBar).toBeHidden();

    const chip = page.getByRole("button", { name: /Show map controls/i });
    await expect(chip).toBeVisible();
    await chip.click();

    await expect(dockBar).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Hide map controls" }),
    ).toBeVisible();
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
