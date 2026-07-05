import { type Page, expect } from "@playwright/test";

const LOCAL_GAME_AREA = {
  type: "Polygon",
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

export async function seedLocalSession(page: Page, code = "TEST") {
  await page.addInitScript(
    ({ sessionState }) => {
      localStorage.setItem(
        "jetlag-session",
        JSON.stringify({
          state: { session: sessionState },
          version: 0,
        }),
      );
      localStorage.setItem(
        "jetlag-map",
        JSON.stringify({
          state: {
            keepScreenAwake: false,
            distanceUnit: "imperial",
            mapStyle: "standard",
            layerVisibility: {
              radar: true,
              thermometer: true,
              measuring: true,
              matching: true,
              zone: true,
              pin: true,
              tentacle: true,
              transit: true,
            },
          },
          version: 0,
        }),
      );
    },
    {
      sessionState: {
        id: "local",
        code,
        gameArea: LOCAL_GAME_AREA,
        createdAt: "2026-01-01T00:00:00.000Z",
        memberUids: [],
        tier: "free",
      },
    },
  );
}

export async function blockExternalAssets(page: Page) {
  await page.route("**/*", async (route) => {
    const url = route.request().url();

    if (url.includes("nominatim.openstreetmap.org/search")) {
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
      url.includes("tile.openstreetmap.org") ||
      url.includes("arcgisonline.com") ||
      url.includes("nominatim.openstreetmap.org") ||
      url.includes("overpass")
    ) {
      if (url.includes(".png") || url.includes("tile")) {
        await route.fulfill({
          status: 200,
          contentType: "image/png",
          body: Buffer.from(
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
            "base64",
          ),
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ elements: [], features: [] }),
      });
      return;
    }

    await route.continue();
  });
}

export async function clickMapCenter(page: Page) {
  const map = page.locator(".leaflet-container");
  await map.waitFor();
  const box = await map.boundingBox();
  if (!box) {
    throw new Error("Map container is not visible.");
  }

  await map.click({
    position: {
      x: Math.floor(box.width / 2),
      y: Math.floor(box.height / 2),
    },
  });
}

export async function createSessionFromCreatePage(page: Page) {
  await page.goto("/create");
  await page.getByPlaceholder("Dublin, Ireland").fill("Dublin");
  await page.getByRole("button", { name: "Find place" }).click();
  await page.getByRole("button", { name: "Confirm game area" }).click();
  await expect(page.getByRole("button", { name: "Pin" })).toBeVisible({
    timeout: 15_000,
  });
}

export async function prepareE2EPage(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem("jetlag.mapFirstRunDismissed", "1");
  });
  await blockExternalAssets(page);
}

export async function dismissMapOnboarding(page: Page) {
  const gotIt = page.getByRole("button", { name: "Got it" });
  if (await gotIt.isVisible().catch(() => false)) {
    await gotIt.click();
  }
}

export async function openMapWithLocalSession(page: Page) {
  await prepareE2EPage(page);
  await seedLocalSession(page);
  await page.goto("/map");
  await page.getByRole("button", { name: "Pin" }).waitFor();
}
