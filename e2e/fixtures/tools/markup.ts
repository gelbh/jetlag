import { type Page, expect } from "@playwright/test";
import {
  clickMapAt,
  clickMapCenter,
  expectMapHasAnnotations,
  selectDrawTool,
} from "../map";
import { dismissActiveToolPanel } from "./question-wizards";

export async function placePin(page: Page, note = "Camp") {
  await dismissActiveToolPanel(page);
  await selectDrawTool(page, "Pin");
  await clickMapCenter(page);
  await expect(page.getByText("Location pinned on the map.")).toBeVisible();
  await page.getByPlaceholder("Closer to the train station than us").fill(note);
  await page.getByRole("button", { name: "Add note" }).click();
  await expectMapHasAnnotations(page);
}

export async function drawZone(page: Page, label = "Search zone") {
  await selectDrawTool(page, "Zone");
  await clickMapAt(page, 0.45, 0.45);
  await clickMapAt(page, 0.55, 0.45);
  await clickMapAt(page, 0.5, 0.52);
  await expect(page.getByText(/Vertices:\s*3/i)).toBeVisible({ timeout: 15_000 });
  await page.getByPlaceholder("Optional zone label").fill(label);
  await page.getByRole("button", { name: "Close zone", exact: true }).click();
  await expectMapHasAnnotations(page);
}
