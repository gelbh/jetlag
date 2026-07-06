import { test, expect } from "../fixtures";
import {
  completeRadarSolo,
  openMapWithLocalSession,
  placePin,
  undoAnnotation,
} from "../fixtures";

test("@smoke completes a solo radar question", async ({ page }) => {
  await openMapWithLocalSession(page);
  await completeRadarSolo(page);
});

test("@smoke places a pin and supports undo", async ({ page }) => {
  await openMapWithLocalSession(page);
  await placePin(page);
  await undoAnnotation(page);
  await expect(
    page.getByRole("button", { name: "Redo last annotation" }),
  ).toBeEnabled();
});
