import { test, expect } from "@playwright/test";
import { openMapWithLocalSession } from "./fixtures/app";

test("toggles satellite basemap and transit layer visibility", async ({
  page,
}) => {
  await openMapWithLocalSession(page);

  await page.getByRole("button", { name: "Open settings" }).click();
  await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();

  const settingsPanel = page.getByRole("tabpanel");
  await settingsPanel.getByRole("button", { name: "Satellite" }).click();
  await page.getByRole("tab", { name: "Layers" }).click();
  await settingsPanel.getByLabel("Transit").click();
  await page.getByRole("button", { name: "Close" }).click();

  await page.getByRole("button", { name: "Open settings" }).click();
  await expect(
    settingsPanel.getByRole("button", { name: "Satellite" }),
  ).toBeVisible();
});
