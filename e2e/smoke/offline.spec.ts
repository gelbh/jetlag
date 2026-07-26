import { test, expect } from "../fixtures";
import {
  clickMapCenter,
  openMapWithLocalSession,
  selectDrawTool,
} from "../fixtures";

test("@smoke keeps the map usable while offline", async ({ page, context }) => {
  test.setTimeout(60_000);
  await openMapWithLocalSession(page);
  await context.setOffline(true);

  await selectDrawTool(page, "Pin");
  await clickMapCenter(page);
  await expect(page.getByText("Location pinned on the map.")).toBeVisible();

  await context.setOffline(false);
  await expect(page.getByRole("button", { name: "Matching" })).toBeVisible();
});
