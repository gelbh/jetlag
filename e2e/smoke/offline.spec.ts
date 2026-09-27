import { test, expect } from "../fixtures";
import {
  clickMapAtLatLng,
  E2E_GEOLOCATION,
  openMapWithLocalSession,
  selectDrawTool,
} from "../fixtures";

test("@smoke keeps the map usable while offline", async ({ page, context }) => {
  test.setTimeout(60_000);
  await openMapWithLocalSession(page);
  await context.setOffline(true);

  await selectDrawTool(page, "Pin");
  await clickMapAtLatLng(
    page,
    E2E_GEOLOCATION.latitude,
    E2E_GEOLOCATION.longitude,
  );
  await expect(
    page.getByText(/Location pinned on the map/i),
  ).toBeVisible({ timeout: 15_000 });

  await context.setOffline(false);
  await expect(page.getByRole("button", { name: "Matching" })).toBeVisible();
});
