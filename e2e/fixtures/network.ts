import { type Page } from "@playwright/test";
import {
  resolveOverpassResponse,
  type OverpassFixtureProfile,
} from "./overpass/resolver";

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
