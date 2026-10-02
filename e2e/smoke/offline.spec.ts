import {
  clickMapAtLatLng,
  E2E_GEOLOCATION,
  expect,
  MAP_CONTAINER_SELECTOR,
  openMapWithLocalSession,
  selectDrawTool,
  test,
} from "../fixtures";

test("@smoke keeps the map usable while offline", async ({ page, context }) => {
  test.setTimeout(60_000);
  await openMapWithLocalSession(page);

  // Fail-closed: do not use waitForMapTilesLoaded (soft early-return if the
  // container is missing). Map must be ready before setOffline cuts network.
  const map = page.locator(MAP_CONTAINER_SELECTOR).first();
  await expect(map).toBeVisible({ timeout: 15_000 });
  await expect
    .poll(async () => page.locator(".maplibregl-canvas").count(), {
      timeout: 30_000,
    })
    .toBeGreaterThan(0);

  await context.setOffline(true);

  await selectDrawTool(page, "Pin");
  await clickMapAtLatLng(page, E2E_GEOLOCATION.latitude, E2E_GEOLOCATION.longitude);
  await expect(page.getByText(/Location pinned on the map/i)).toBeVisible({ timeout: 15_000 });

  await context.setOffline(false);
  await expect(page.getByRole("button", { name: "Matching" })).toBeVisible();
});
