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
  const map = page.locator(MAP_CONTAINER_SELECTOR).first();
  await map.waitFor();
  const box = await map.boundingBox();
  if (!box) {
    throw new Error("Map container is not visible.");
  }

  await map.click({
    position: {
      x: Math.floor(box.width * xRatio),
      y: Math.floor(box.height * yRatio),
    },
    force: true,
  });
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

/** DOM markers (pins) plus persisted active annotations (canvas overlays). */
export async function countMapAnnotations(page: Page): Promise<number> {
  const markers = await page.locator(".maplibregl-marker").count();
  const stored = await countPersistedActiveAnnotations(page);
  return Math.max(markers, stored);
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

export async function selectDrawTool(page: Page, toolName: "Pin" | "Zone") {
  const drawButton = page.getByRole("button", { name: "Draw on map" });
  await expect(drawButton).toBeVisible();
  await drawButton.click();
  await page.getByRole("menuitem", { name: toolName }).click();
}

export async function clickToolDockButton(page: Page, name: string) {
  await page
    .getByLabel("Question tools")
    .getByRole("button", { name, exact: true })
    .click();
}
