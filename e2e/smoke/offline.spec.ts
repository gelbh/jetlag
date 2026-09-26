import { test, expect } from "../fixtures";
import {
  E2E_GEOLOCATION,
  clickMapAtLatLng,
  openMapWithLocalSession,
  selectDrawTool,
} from "../fixtures";

test("@smoke keeps the map usable while offline", async ({ page, context }) => {
  test.setTimeout(60_000);
  await openMapWithLocalSession(page);
  await context.setOffline(true);

  await selectDrawTool(page, "Pin");
  await expect(
    page.getByText("Tap the map to place a note for matching or measuring questions."),
  ).toBeVisible({ timeout: 10_000 });
  await clickMapAtLatLng(
    page,
    E2E_GEOLOCATION.latitude,
    E2E_GEOLOCATION.longitude,
  );
  await expect(page.getByText("Location pinned on the map.")).toBeVisible();

  await context.setOffline(false);
  await expect(page.getByRole("button", { name: "Matching" })).toBeVisible();
});
