import { type Page, expect } from "@playwright/test";
import {
  E2E_GEOLOCATION,
  clickMapAtLatLng,
  expectMapHasAnnotations,
  selectDrawTool,
} from "../map";
import { dismissActiveToolPanel } from "./question-wizards";

export async function placePin(page: Page, note = "Camp") {
  await dismissActiveToolPanel(page);
  await selectDrawTool(page, "Pin");
  await expect(
    page.getByText("Tap the map to place a note for matching or measuring questions."),
  ).toBeVisible({ timeout: 10_000 });
  // Canvas clicks miss MapLibre under sheet stacking; fire lng/lat on the map.
  await clickMapAtLatLng(
    page,
    E2E_GEOLOCATION.latitude,
    E2E_GEOLOCATION.longitude,
  );
  await expect(page.getByText("Location pinned on the map.")).toBeVisible();
  await page.getByPlaceholder("Closer to the train station than us").fill(note);
  await page.getByRole("button", { name: "Add note" }).click();
  await expectMapHasAnnotations(page);
}

export async function drawZone(page: Page, label = "Search zone") {
  await selectDrawTool(page, "Zone");
  await expect(page.getByText(/Tap the map|Vertices/i).first()).toBeVisible({
    timeout: 10_000,
  });
  const { latitude: lat, longitude: lng } = E2E_GEOLOCATION;
  await clickMapAtLatLng(page, lat + 0.002, lng - 0.002);
  await clickMapAtLatLng(page, lat + 0.002, lng + 0.002);
  await clickMapAtLatLng(page, lat - 0.002, lng);
  await expect(page.getByText(/Vertices:\s*3/i)).toBeVisible({ timeout: 15_000 });
  await page.getByPlaceholder("Optional zone label").fill(label);
  await page.getByRole("button", { name: "Close zone", exact: true }).click();
  await expectMapHasAnnotations(page);
}
