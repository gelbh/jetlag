import { test, expect } from "../fixtures";
import { openMapWithLocalSession, selectDrawTool } from "../fixtures";

test("@smoke keeps the map usable while offline", async ({ page, context }) => {
  test.setTimeout(60_000);
  await openMapWithLocalSession(page);
  await context.setOffline(true);

  await selectDrawTool(page, "Pin");
  await expect(page.locator(".jl-mode-ticker")).toHaveText("Pin");

  await context.setOffline(false);
  await expect(page.getByRole("button", { name: "Matching" })).toBeVisible();
});
