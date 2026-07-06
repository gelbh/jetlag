import { type Page } from "@playwright/test";
import {
  resolveOverpassResponse,
  type OverpassFixtureProfile,
} from "./overpass/resolver";

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

const OVERPASS_API_HOSTS = new Set([
  "overpass-api.de",
  "maps.mail.ru",
  "overpass.kumi.systems",
]);

const TILE_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

export interface BlockExternalAssetsOptions {
  overpassProfile?: OverpassFixtureProfile;
}

function extractOverpassQuery(postData: string): string {
  try {
    const params = new URLSearchParams(postData);
    const data = params.get("data");
    if (data) {
      return decodeURIComponent(data);
    }
  } catch {
    // Fall back to the raw POST body below.
  }

  return postData;
}

function isOverpassRequest(hostname: string, pathname: string): boolean {
  return OVERPASS_API_HOSTS.has(hostname) || pathname.includes("/interpreter");
}

function isLocalAppRequest(url: string): boolean {
  try {
    const { hostname } = new URL(url);
    return hostname === "127.0.0.1" || hostname === "localhost";
  } catch {
    return false;
  }
}

export async function blockExternalAssets(
  page: Page,
  options: BlockExternalAssetsOptions = {},
) {
  const overpassProfile = options.overpassProfile ?? "default";

  await page.route("**/*", async (route) => {
    const url = route.request().url();

    if (isLocalAppRequest(url)) {
      await route.continue();
      return;
    }

    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      await route.continue();
      return;
    }

    const { hostname, pathname } = parsed;

    if (
      hostname === "nominatim.openstreetmap.org" &&
      pathname.includes("/search")
    ) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          {
            place_id: 1,
            display_name: "Dublin, Ireland",
            lat: "53.35",
            lon: "-6.26",
            boundingbox: ["53.27", "53.42", "-6.45", "-6.08"],
          },
        ]),
      });
      return;
    }

    if (
      hostname === "tile.openstreetmap.org" ||
      hostname.endsWith(".basemaps.cartocdn.com") ||
      hostname.includes("arcgisonline.com")
    ) {
      await route.fulfill({
        status: 200,
        contentType: "image/png",
        body: TILE_PNG,
      });
      return;
    }

    if (
      isOverpassRequest(hostname, pathname) ||
      url.includes("overpass") ||
      pathname.includes("interpreter")
    ) {
      const postData = route.request().postData() ?? "";
      const queryFromPost = postData ? extractOverpassQuery(postData) : "";
      const queryFromUrl = parsed.searchParams.get("data") ?? "";
      const query = queryFromPost || decodeURIComponent(queryFromUrl);
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: resolveOverpassResponse(query, overpassProfile),
      });
      return;
    }

    await route.continue();
  });
}

async function applyPageCaptureInit(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem("jetlag.mapFirstRunDismissed", "1");
    try {
      indexedDB.deleteDatabase("jetlag-geographic-cache");
    } catch {
      // IndexedDB may be unavailable in some contexts.
    }
  });
}

export async function prepareE2EPage(
  page: Page,
  options: BlockExternalAssetsOptions = {},
) {
  await applyPageCaptureInit(page);
  await blockExternalAssets(page, options);
}

export async function dismissMapOnboarding(page: Page) {
  const close = page.getByRole("button", { name: "Close" });
  if (await close.isVisible().catch(() => false)) {
    await close.click();
  }
}

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

export async function expectMapHasAnnotations(page: Page, minCount = 1) {
  const shapes = page.locator(".leaflet-overlay-pane .leaflet-interactive");
  await shapes.first().waitFor({ state: "attached", timeout: 15_000 });
  const count = await shapes.count();
  if (count < minCount) {
    throw new Error(`Expected at least ${minCount} map annotations, found ${count}.`);
  }
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
  await sheet.getByRole("button", { name: toolName }).click();
}

export async function clickToolDockButton(page: Page, name: string) {
  await page
    .getByLabel("Question tools")
    .getByRole("button", { name, exact: true })
    .click();
}
