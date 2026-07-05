import { test, expect } from "@playwright/test";
import { openMapWithLocalSession } from "./fixtures/app";

test("keeps the map usable while offline", async ({ page, context }) => {
  await openMapWithLocalSession(page);
  await context.setOffline(true);

  const pinButton = page.getByRole("button", { name: "Pin", exact: true });
  await pinButton.click();
  await expect(pinButton).toHaveAttribute("aria-pressed", "true");

  await context.setOffline(false);
  await expect(pinButton).toBeVisible();
});
