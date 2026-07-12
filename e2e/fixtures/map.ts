import { type Page, expect } from "@playwright/test";
import { clickViaEvaluate } from "./dom";

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

export async function clickMapAt(
  page: Page,
  xRatio: number,
  yRatio: number,
) {
  const map = page.locator(".leaflet-container");
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

/** Fill color of the combined elimination mask (mapAnnotationColors.elimination). */
const ELIMINATION_FILL = "#1D2835";

/** Committed, answered questions shade the map via the combined elimination mask. */
export async function expectEliminationMaskVisible(page: Page) {
  await expect(
    page
      .locator(`.leaflet-overlay-pane path[fill="${ELIMINATION_FILL}"]`)
      .first(),
  ).toBeVisible({ timeout: 15_000 });
}

export async function expectMapHasAnnotations(page: Page, minCount = 1) {
  const shapes = page.locator(".leaflet-overlay-pane .leaflet-interactive");
  await shapes.first().waitFor({ state: "attached", timeout: 15_000 });
  const count = await shapes.count();
  if (count < minCount) {
    throw new Error(`Expected at least ${minCount} map annotations, found ${count}.`);
  }
}

export async function waitForMapTilesLoaded(page: Page) {
  const map = page.locator(".leaflet-container");
  if (!(await map.isVisible().catch(() => false))) {
    return;
  }

  await expect
    .poll(
      async () => page.locator(".leaflet-tile-loaded").count(),
      { timeout: 30_000 },
    )
    .toBeGreaterThan(0);
}

export async function selectDrawTool(page: Page, toolName: "Pin" | "Zone") {
  const drawButton = page.getByRole("button", { name: "Draw on map" });
  if (await drawButton.isVisible().catch(() => false)) {
    await drawButton.click();
    await page.getByRole("menuitem", { name: toolName }).click();
    return;
  }

  await page.getByRole("button", { name: "More tools" }).click();
  const sheet = page.getByRole("dialog", { name: "More tools" });
  await sheet.waitFor({ state: "visible" });
  const toolButton = sheet.getByRole("button", { name: toolName });
  await expect(toolButton).toBeVisible();
  await clickViaEvaluate(toolButton);
}

export async function clickToolDockButton(page: Page, name: string) {
  await page
    .getByLabel("Question tools")
    .getByRole("button", { name, exact: true })
    .click();
}
