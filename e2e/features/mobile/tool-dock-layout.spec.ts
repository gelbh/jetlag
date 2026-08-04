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
  clickViaEvaluate,
  assertInViewport,
} from "../../fixtures";
import type { Page } from "@playwright/test";

async function assertSideStackClearsZoom(page: Page) {
  const sideStack = page.locator(".jl-map-chrome-side-stack");
  const session = sideStack.locator("[data-island='session']");
  const zoom = page.locator(".map-zoom-control");
  const style = page.locator(".map-style-control");
  await expect(sideStack).toHaveCount(1);
  await expect(sideStack).toBeVisible();
  await expect(session).toHaveCount(1);
  await expect(session).toBeVisible();
  await expect(zoom).toBeVisible();
  await expect(style).toBeVisible();
  await assertInViewport(sideStack);
  await assertInViewport(session);
  await assertInViewport(zoom);

  const metrics = await page.evaluate(() => {
    const side = document.querySelector(".jl-map-chrome-side-stack");
    const zoomEl = document.querySelector(".map-zoom-control");
    const styleEl = document.querySelector(".map-style-control");
    const sessionEl = document.querySelector(
      ".jl-map-chrome-side-stack [data-island='session']",
    );
    if (!side || !zoomEl || !styleEl || !sessionEl) {
      return { missing: true as const };
    }
    const sideRect = side.getBoundingClientRect();
    const zoomRect = zoomEl.getBoundingClientRect();
    const styleRect = styleEl.getBoundingClientRect();
    const sessionRect = sessionEl.getBoundingClientRect();
    const overlapX =
      Math.min(sideRect.right, zoomRect.right) -
      Math.max(sideRect.left, zoomRect.left);
    const overlapY =
      Math.min(sideRect.bottom, zoomRect.bottom) -
      Math.max(sideRect.top, zoomRect.top);
    return {
      missing: false as const,
      intersects: overlapX > 1 && overlapY > 1,
      zoomLeft: zoomRect.left,
      styleLeft: styleRect.left,
      sideLeft: sideRect.left,
      zoomBottom: zoomRect.bottom,
      styleTop: styleRect.top,
      sessionTop: sessionRect.top,
    };
  });

  expect(metrics.missing).toBe(false);
  if (metrics.missing) {
    return;
  }
  expect(metrics.intersects).toBe(false);
  // Zoom sits on the left column, above the satellite toggle — not under Session.
  expect(metrics.zoomLeft).toBeLessThan(metrics.sideLeft);
  expect(metrics.styleLeft).toBeLessThan(metrics.sideLeft);
  expect(metrics.zoomBottom).toBeLessThanOrEqual(metrics.styleTop + 2);
  expect(metrics.sessionTop).toBeGreaterThanOrEqual(-1);
}

test.describe("mobile tool dock", () => {
  test.beforeEach(async ({ page }) => {
    await openMapWithLocalSession(page);
  });

  test("@smoke exposes history in hunt, draw on session, without a More sheet", async ({
    page,
  }) => {
    const hunt = page.locator('[data-island="hunt"]');
    await expect(hunt).toBeVisible();
    await expect(
      hunt.getByRole("button", { name: "Undo last annotation" }),
    ).toBeVisible();
    await expect(
      hunt.getByRole("button", { name: "Redo last annotation" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "More tools" }),
    ).toHaveCount(0);

    const sessionTools = page.getByLabel("Session tools");
    await expect(sessionTools).toBeVisible();
    const drawButton = sessionTools.getByRole("button", { name: "Draw on map" });
    await expect(drawButton).toBeVisible();
    await clickViaEvaluate(drawButton);
    const drawMenu = page.getByRole("menu", { name: "Draw on map" });
    await expect(drawMenu).toBeVisible();
    await expect(drawMenu.getByRole("menuitem", { name: /Pin/i })).toBeVisible();
    await expect(drawMenu.getByRole("menuitem", { name: /Zone/i })).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(drawMenu).toBeHidden();

    await expect(
      sessionTools.getByRole("button", { name: "Open settings" }),
    ).toBeVisible();
    await expect(
      sessionTools.getByRole("button", { name: /^Open chat/ }),
    ).toBeVisible();
    await expect(
      sessionTools.getByRole("button", { name: "Open session log" }),
    ).toBeVisible();
    await expect(
      sessionTools.getByRole("button", { name: "Report a problem" }),
    ).toBeVisible();
    await sessionTools.getByRole("button", { name: "Report a problem" }).click();
    await expect(
      page.getByRole("dialog", { name: "Report problem" }),
    ).toBeVisible();

    await expect(page.locator('[data-island="history-start"]')).toHaveCount(0);
    await expect(page.locator('[data-island="history-end"]')).toHaveCount(0);
    await expect(page.locator('[data-island="hunt"]')).toHaveCount(1);
    const bandOrder = await page
      .locator(".jl-map-chrome-bottom-band [data-island]")
      .evaluateAll((nodes) =>
        nodes.map((node) => node.getAttribute("data-island")),
      );
    expect(bandOrder).toEqual(["hunt"]);
    await expect(page.locator('[data-island="session"]')).toHaveCount(1);
    await expect(page.locator(".jl-map-chrome-bottom-band")).toHaveCount(1);
    await expect(page.locator(".jl-map-chrome-side-stack")).toHaveCount(1);
    await expect(
      page.locator(".jl-map-chrome-bottom-band [data-island='session']"),
    ).toHaveCount(0);
    await expect(
      page.locator(".jl-map-chrome-side-stack [data-island='session']"),
    ).toHaveCount(1);
    await expect(page.locator(".jl-tool-dock-bar--secondary")).toHaveCount(0);
  });

  test("hunt island does not use horizontal scroll", async ({ page }) => {
    const hunt = page.locator('[data-island="hunt"]');
    const overflowX = await hunt.evaluate((el) => getComputedStyle(el).overflowX);
    // hidden/clip/visible all OK — we must not use overflow-x: auto/scroll.
    expect(["visible", "clip", "hidden"]).toContain(overflowX);
    const metrics = await readToolDockOverflowMetrics(page);
    expect(metrics.overflowSlots).toBe(0);
  });

  test("@smoke side stack clears left zoom column", async ({ page }) => {
    // Narrow portrait exercises --map-chrome-zoom-stack-height: 5.25rem (≤28rem).
    await page.setViewportSize({ width: 390, height: 844 });
    await openMapWithLocalSession(page);
    await assertSideStackClearsZoom(page);
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
    expect(labels.some((label) => label.text === "Draw")).toBe(true);
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
    expect(labels.some((label) => label.text === "Draw")).toBe(true);
  });

  test("supports undo from the hunt island after placing a pin", async ({
    page,
  }) => {
    await placePin(page);
    await page.getByRole("button", { name: "Undo last annotation" }).click();
    await expect(
      page.getByRole("button", { name: "Redo last annotation" }),
    ).toBeEnabled();
  });
});

test.describe("iPhone 14 Pro Max tool dock", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 430, height: 932 });
    await openMapWithLocalSession(page);
  });

  test("renders floating islands without a dual-row dock", async ({ page }) => {
    await expect(page.locator('[data-island="hunt"]')).toHaveCount(1);
    await expect(page.locator('[data-island="session"]')).toHaveCount(1);
    await expect(page.locator(".jl-tool-dock-bar--secondary")).toHaveCount(0);

    const metrics = await page.evaluate(() => {
      const hunt = document.querySelector('[data-island="hunt"]');
      const dock = document.querySelector(".jl-map-bottom-chrome");
      const dockRect = dock?.getBoundingClientRect();
      const huntRect = hunt?.getBoundingClientRect();
      return {
        islandCount: document.querySelectorAll("[data-island]").length,
        viewportHeight: window.innerHeight,
        huntBottom: huntRect?.bottom ?? 0,
        dockBottom: dockRect?.bottom ?? 0,
      };
    });

    expect(metrics.islandCount).toBeGreaterThanOrEqual(2);
    expect(metrics.huntBottom).toBeLessThanOrEqual(metrics.viewportHeight + 1);
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
      const host = document.querySelector(".jl-map-bottom-chrome-host");
      const chrome = document.querySelector(".jl-map-bottom-chrome");
      const hunt = document.querySelector(".jl-map-island--hunt");
      const map = document.querySelector(".maplibregl-map");
      const hostRect = host?.getBoundingClientRect();
      const huntRect = hunt?.getBoundingClientRect();
      const mapRect = map?.getBoundingClientRect();
      const slots = [...document.querySelectorAll(".jl-tool-slot")].filter(
        (el) => el.getBoundingClientRect().width > 0,
      );
      const lowestSlotBottom = Math.max(
        ...slots.map((el) => el.getBoundingClientRect().bottom),
        0,
      );
      const hostStyle = host ? getComputedStyle(host) : null;
      const chromeStyle = chrome ? getComputedStyle(chrome) : null;
      const huntStyle = hunt ? getComputedStyle(hunt) : null;
      return {
        viewportHeight: window.innerHeight,
        dockBottom: hostRect?.bottom ?? 0,
        barHeight: huntRect?.height ?? 0,
        barBottom: huntRect?.bottom ?? 0,
        mapBottom: mapRect?.bottom ?? 0,
        dockPaddingBottom: chromeStyle
          ? Number.parseFloat(chromeStyle.paddingBottom)
          : 0,
        dockBottomOffset: hostStyle
          ? Number.parseFloat(hostStyle.bottom)
          : 0,
        barPaddingBottom: huntStyle
          ? Number.parseFloat(huntStyle.paddingBottom)
          : 0,
        lowestSlotBottom,
        gapBelowDock: window.innerHeight - (hostRect?.bottom ?? 0),
        deadSpaceBelowIcons:
          (huntRect?.bottom ?? 0) -
          lowestSlotBottom -
          (huntStyle ? Number.parseFloat(huntStyle.paddingBottom) : 0),
        islandCount: document.querySelectorAll("[data-island]").length,
        backdropOnMap: document.querySelector(".app-entry-backdrop"),
      };
    });

    expect(metrics.backdropOnMap).toBeNull();
    expect(metrics.islandCount).toBeGreaterThanOrEqual(2);
    // Host chassis: flush to physical bottom; chrome pad absorbs safe-area.
    expect(metrics.dockBottomOffset).toBeLessThanOrEqual(1);
    expect(metrics.gapBelowDock).toBeLessThanOrEqual(2);
    expect(
      Math.abs(metrics.dockBottom - metrics.viewportHeight),
    ).toBeLessThanOrEqual(2);
    expect(metrics.dockPaddingBottom).toBeGreaterThanOrEqual(
      SIMULATED_SAFE_AREA_BOTTOM_PX - 2,
    );
    // Forbidden: safe-area pad inside the bordered island (reverted stripe).
    expect(metrics.barPaddingBottom).toBeLessThanOrEqual(6);
    expect(Math.abs(metrics.mapBottom - metrics.viewportHeight)).toBeLessThanOrEqual(
      2,
    );
    expect(metrics.barHeight).toBeLessThanOrEqual(72);
    expect(metrics.deadSpaceBelowIcons).toBeLessThanOrEqual(8);
  });

  test("standalone display-mode keeps flush dock chassis with home indicator", async ({
    page,
  }) => {
    await injectStandaloneDisplayMode(page);
    await page.reload();
    await expect(page.locator(".jl-map-bottom-chrome-host")).toBeVisible();
    await injectSimulatedSafeAreaBottom(page, SIMULATED_SAFE_AREA_BOTTOM_PX);

    const metrics = await page.evaluate(() => {
      const host = document.querySelector(".jl-map-bottom-chrome-host");
      const chrome = document.querySelector(".jl-map-bottom-chrome");
      const hostRect = host?.getBoundingClientRect();
      const chromeStyle = chrome ? getComputedStyle(chrome) : null;
      return {
        viewportHeight: window.innerHeight,
        dockBottom: hostRect?.bottom ?? 0,
        dockPaddingBottom: chromeStyle
          ? Number.parseFloat(chromeStyle.paddingBottom)
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
    const dock = page.locator(".jl-tool-dock");
    await expect(dock).toBeHidden();

    const chip = page.getByRole("button", { name: /Show map controls/i });
    await expect(chip).toBeVisible();
    await chip.click();

    await expect(dock).toBeVisible();
    await expect(page.locator('[data-island="hunt"]')).toHaveCount(1);
    await expect(page.locator('[data-island="session"]')).toHaveCount(1);
    await expect(
      page.getByRole("button", { name: "Hide map controls" }),
    ).toBeVisible();
  });

  test("@smoke side stack clears zoom after dock reveal in landscape", async ({
    page,
  }) => {
    // Short landscape uses --map-chrome-zoom-stack-height: 6.25rem.
    await page.getByRole("button", { name: /Show map controls/i }).click();
    await expect(page.locator(".jl-tool-dock")).toBeVisible();
    await assertSideStackClearsZoom(page);
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
