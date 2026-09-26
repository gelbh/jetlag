import { type Page, expect } from "@playwright/test";

/** Matches Playwright `use.geolocation` in playwright.config.ts */
export const E2E_GEOLOCATION = { latitude: 53.35, longitude: -6.26 };

export const LOCAL_GAME_AREA = {
  type: "Polygon" as const,
  coordinates: [
    [
      [-6.45, 53.27],
      [-6.08, 53.27],
      [-6.08, 53.42],
      [-6.45, 53.42],
      [-6.45, 53.27],
    ],
  ],
};

export async function clickMapCenter(page: Page) {
  await clickMapAt(page, 0.5, 0.5);
}

/** MapLibre map surface. */
export const MAP_CONTAINER_SELECTOR = ".maplibregl-map";

export async function clickMapAt(
  page: Page,
  xRatio: number,
  yRatio: number,
) {
  // Prefer the WebGL canvas — MapLibre listens there; parent .maplibregl-map
  // clicks can miss the handler under Ask HUD stacking.
  const canvas = page.locator(`${MAP_CONTAINER_SELECTOR} canvas`).first();
  await canvas.waitFor({ state: "visible", timeout: 15_000 });
  const box = await canvas.boundingBox();
  if (!box) {
    throw new Error("Map canvas is not visible.");
  }

  await canvas.click({
    position: {
      x: Math.floor(box.width * xRatio),
      y: Math.floor(box.height * yRatio),
    },
    force: true,
  });
}

/**
 * Fire a MapLibre map click at a WGS84 point. Prefer this under Ask HUD /
 * Mantine Drawer stacking — Playwright canvas clicks often never reach
 * MapLibre's own click handlers.
 */
export async function clickMapAtLatLng(
  page: Page,
  latitude: number,
  longitude: number,
) {
  await page.locator(`${MAP_CONTAINER_SELECTOR} canvas`).first().waitFor({
    state: "visible",
    timeout: 15_000,
  });
  const fired = await page.evaluate(
    ({ sel, latitude: lat, longitude: lng }) => {
      const root = document.querySelector(sel) as HTMLElement | null;
      if (!root) {
        return false;
      }
      type AnyRec = Record<string, unknown>;
      const seen = new Set<unknown>();
      let map: {
        fire: (type: string, ev: unknown) => void;
        project: (lngLat: [number, number]) => { x: number; y: number };
      } | null = null;
      const visit = (node: unknown, depth: number) => {
        if (!node || depth > 14 || seen.has(node) || typeof node !== "object") {
          return;
        }
        seen.add(node);
        const rec = node as AnyRec;
        if (
          typeof rec.fire === "function" &&
          typeof rec.project === "function" &&
          typeof rec.on === "function"
        ) {
          map = rec as typeof map;
          return;
        }
        for (const key of Object.getOwnPropertyNames(rec)) {
          if (map) {
            return;
          }
          if (
            key.startsWith("__react") ||
            key === "stateNode" ||
            key === "child" ||
            key === "memoizedState" ||
            key === "memoizedProps" ||
            key === "return" ||
            key === "sibling" ||
            key === "current" ||
            key === "map" ||
            key === "_map" ||
            key === "deps" ||
            key === "next" ||
            key === "queue"
          ) {
            try {
              visit(rec[key], depth + 1);
            } catch {
              /* ignore cyclic / revoked */
            }
          }
        }
      };
      const fiberKey = Object.keys(root).find((k) =>
        k.startsWith("__reactFiber"),
      );
      if (fiberKey) {
        visit((root as AnyRec)[fiberKey], 0);
      }
      if (!map) {
        return false;
      }
      const point = map.project([lng, lat]);
      map.fire("click", {
        lngLat: { lng, lat },
        point,
        originalEvent: new MouseEvent("click"),
      });
      return true;
    },
    { sel: MAP_CONTAINER_SELECTOR, latitude, longitude },
  );
  if (!fired) {
    throw new Error("MapLibre map instance not found for clickMapAtLatLng.");
  }
}

async function countPersistedActiveAnnotations(page: Page): Promise<number> {
  return page.evaluate(() => {
    try {
      const raw = localStorage.getItem("jetlag-annotations");
      if (!raw) {
        return 0;
      }
      const parsed = JSON.parse(raw) as {
        state?: { annotations?: Array<{ status?: string }> };
      };
      return (
        parsed.state?.annotations?.filter((a) => a.status !== "deleted")
          .length ?? 0
      );
    } catch {
      return 0;
    }
  });
}

/** Persisted active annotations (GL pins no longer use DOM markers). */
export async function countMapAnnotations(page: Page): Promise<number> {
  return countPersistedActiveAnnotations(page);
}

/** Committed, answered questions shade the map via the combined elimination mask. */
export async function expectEliminationMaskVisible(page: Page) {
  await expect(page.locator(MAP_CONTAINER_SELECTOR).first()).toBeVisible({
    timeout: 15_000,
  });
  await waitForMapTilesLoaded(page);
  await expect
    .poll(async () => {
      const questionAnnotations = await page.evaluate(() => {
        try {
          const raw = localStorage.getItem("jetlag-annotations");
          if (!raw) {
            return 0;
          }
          const parsed = JSON.parse(raw) as {
            state?: {
              annotations?: Array<{ status?: string; type?: string }>;
            };
          };
          return (
            parsed.state?.annotations?.filter(
              (a) =>
                a.status !== "deleted" &&
                a.type !== "pin" &&
                a.type !== "zone",
            ).length ?? 0
          );
        } catch {
          return 0;
        }
      });
      return questionAnnotations;
    }, { timeout: 15_000 })
    .toBeGreaterThan(0);
}

export async function expectMapHasAnnotations(page: Page, minCount = 1) {
  await expect
    .poll(() => countMapAnnotations(page), { timeout: 15_000 })
    .toBeGreaterThanOrEqual(minCount);
}

export async function waitForMapTilesLoaded(page: Page) {
  const map = page.locator(MAP_CONTAINER_SELECTOR).first();
  if (!(await map.isVisible().catch(() => false))) {
    return;
  }

  await expect
    .poll(async () => page.locator(".maplibregl-canvas").count(), {
      timeout: 30_000,
    })
    .toBeGreaterThan(0);
}

export async function clickToolDockButton(page: Page, name: string) {
  // Default dock groups undo+questions as "History and question tools".
  // Flag-on ask-first uses "Question tools" / "Question tool switcher".
  // Playwright RegExp labels are full-string matches (strings are substrings).
  const questionTools = page
    .getByLabel("History and question tools")
    .or(page.getByLabel("Question tools"))
    .or(page.getByLabel("Question tool switcher"));
  const button = questionTools.getByRole("button", { name, exact: true });
  await expect(button).toBeVisible();
  const isPreviewOnly =
    (await button.getAttribute("title"))?.includes("Preview only") ?? false;
  // DOM click — avoids hit-target misses when Draw shares the hunt strip.
  await button.evaluate((el) => {
    if (el instanceof HTMLElement) {
      el.click();
    }
  });
  // Tool becomes active: for normal selection, aria-pressed="true".
  // Preview-only (open question): aria-pressed stays false — wait for HUD.
  // Ask-first unmounts the hunt strip and portals the sheet, so the dock
  // button may disappear and ask-hud-host may be attached but zero-size.
  const hud = page.getByTestId("ask-hud-host");
  const toolDialog = page.getByRole("dialog", { name, exact: true });
  if (!isPreviewOnly) {
    await expect
      .poll(
        async () => {
          if ((await hud.count()) > 0 || (await toolDialog.count()) > 0) {
            return "hud";
          }
          if ((await button.count()) === 0) {
            return "gone";
          }
          return (await button.getAttribute("aria-pressed")) === "true"
            ? "pressed"
            : "idle";
        },
        { timeout: 15_000 },
      )
      .toMatch(/^(hud|pressed)$/);
    return;
  }
  if ((await hud.count()) === 0 && (await toolDialog.count()) === 0) {
    await button.evaluate((el) => {
      if (el instanceof HTMLElement) {
        el.click();
      }
    });
  }
  await expect
    .poll(
      async () => (await hud.count()) > 0 || (await toolDialog.count()) > 0,
      { timeout: 15_000 },
    )
    .toBe(true);
}

export async function selectDrawTool(page: Page, toolName: "Pin" | "Zone") {
  const drawButton = page.getByRole("button", { name: "Draw on map" });
  await expect(drawButton).toBeVisible();
  // Hunt island now fits all tools without horizontal scroll; click directly.
  await drawButton.evaluate((el) => {
    if (el instanceof HTMLElement) {
      el.click();
    }
  });
  // Wave 2 Draw menu is a SheetHost dialog (not an inline popover).
  const drawSheet = page.getByRole("dialog", { name: "Draw on map" });
  await expect(drawSheet).toBeVisible({ timeout: 10_000 });
  await drawSheet.getByRole("menuitemradio", { name: toolName }).click();
  await expect(drawSheet).toBeHidden({ timeout: 10_000 });
}
