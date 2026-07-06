import { test, expect } from "@playwright/test";
import { openMapWithLocalSession, selectDrawTool } from "./fixtures/app";

test("keeps the map usable while offline", async ({ page, context }) => {
  await openMapWithLocalSession(page);
  await context.setOffline(true);

  await selectDrawTool(page, "Pin");
  await expect(page.locator(".jl-mode-ticker")).toHaveText("Pin");

  await context.setOffline(false);
  await expect(page.getByRole("button", { name: "Matching" })).toBeVisible();
});
