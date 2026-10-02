import { expect, type Page } from "@playwright/test";
import { clickMapAtLatLng, E2E_GEOLOCATION, expectMapHasAnnotations, selectDrawTool } from "../map";
import { dismissActiveToolPanel, expandToolPanelIfPeeked } from "./question-wizards";

export async function placePin(page: Page, note = "Camp") {
  await dismissActiveToolPanel(page);
  await selectDrawTool(page, "Pin");
  await expandToolPanelIfPeeked(page);
  // Canvas center often sits under the floating panel; fire MapLibre at GPS.
  await clickMapAtLatLng(page, E2E_GEOLOCATION.latitude, E2E_GEOLOCATION.longitude);
  await expect(page.getByText(/Location pinned on the map/i)).toBeVisible({
    timeout: 10_000,
  });
  await page.getByPlaceholder("Closer to the train station than us").fill(note);
  await page.getByRole("button", { name: "Add note" }).click();
  await expectMapHasAnnotations(page);
}

export async function drawZone(page: Page, label = "Search zone") {
  await dismissActiveToolPanel(page);
  await selectDrawTool(page, "Zone");
  await expandToolPanelIfPeeked(page);
  // Percentage canvas clicks often hit chrome; place vertices via MapLibre GPS.
  const { latitude: lat, longitude: lng } = E2E_GEOLOCATION;
  await clickMapAtLatLng(page, lat, lng);
  await clickMapAtLatLng(page, lat, lng + 0.002);
  await clickMapAtLatLng(page, lat - 0.002, lng + 0.001);
  await expect(page.getByText(/Vertices:\s*3/i)).toBeVisible({
    timeout: 15_000,
  });
  await page.getByPlaceholder("Optional zone label").fill(label);
  await page.getByRole("button", { name: "Close zone", exact: true }).click();
  await expectMapHasAnnotations(page);
}
