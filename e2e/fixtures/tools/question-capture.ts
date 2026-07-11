import { type Page, expect } from "@playwright/test";
import {
  clickMapAt,
  clickMapCenter,
  clickToolDockButton,
} from "../map";
import {
  captureToolDockStrip,
  captureTutorialMapFocus,
  captureTutorialViewport,
  tutorialQuestionAsset,
} from "../tutorial-capture";
import {
  advanceWizard,
  dismissActiveToolPanel,
  waitForGeoLoadingIdle,
  waitForMapPlacementCrosshair,
  waitForWizardNext,
} from "./question-wizards";
import { assertTutorialCaptureReady } from "./tutorial-capture-ready";

async function captureWizardStep(
  page: Page,
  rootDir: string,
  toolId: string,
  mode: "solo" | "hiders" | "dock",
  stepId: string,
) {
  await captureTutorialViewport(
    page,
    tutorialQuestionAsset(rootDir, toolId, "wizard", mode, `${stepId}.png`),
  );
}

async function selectTutorialRadarDistance(page: Page) {
  const preset = page.getByRole("button", { name: "1 Mile" });
  await expect(preset).toBeVisible({ timeout: 15_000 });
  await preset.click();
}

async function placeHeavyToolAnchorAndAdvance(page: Page) {
  await waitForMapPlacementCrosshair(page);
  await clickMapCenter(page);
  await waitForWizardNext(page);
  await advanceWizard(page);
}

async function selectCategoryOption(page: Page, categoryId: string) {
  const select = page.locator("select.field-input");
  await expect(select).toBeVisible({ timeout: 15_000 });
  await expect(select.locator(`option[value="${categoryId}"]`)).toHaveCount(1, {
    timeout: 15_000,
  });
  await select.selectOption(categoryId);
}

async function captureQuestionMapResults(
  page: Page,
  rootDir: string,
  toolId: string,
) {
  if (toolId === "radar") {
    await expect(page.getByRole("button", { name: "Close Radar" })).toBeHidden({
      timeout: 15_000,
    });
  } else {
    await dismissActiveToolPanel(page);
  }
  await assertTutorialCaptureReady(page, "map-context");
  await captureTutorialViewport(
    page,
    tutorialQuestionAsset(rootDir, toolId, "map", "context.png"),
  );
  await assertTutorialCaptureReady(page, "map-result");
  await captureTutorialMapFocus(
    page,
    tutorialQuestionAsset(rootDir, toolId, "map", "result.png"),
  );
}

export async function captureMatchingQuestionSolo(page: Page, rootDir: string) {
  const toolId = "matching";

  await clickToolDockButton(page, "Matching");
  await waitForMapPlacementCrosshair(page);
  await captureWizardStep(page, rootDir, toolId, "solo", "anchor");
  await clickMapCenter(page);
  await waitForWizardNext(page);
  await advanceWizard(page);
  await captureWizardStep(page, rootDir, toolId, "solo", "category");
  await selectCategoryOption(page, "museum");
  await waitForWizardNext(page);
  await advanceWizard(page);
  await waitForGeoLoadingIdle(page);
  await captureWizardStep(page, rootDir, toolId, "solo", "resolve");
  await waitForWizardNext(page);
  await advanceWizard(page);
  await captureWizardStep(page, rootDir, toolId, "solo", "answer");
  await page.getByRole("button", { name: "Yes" }).click();
  await page.getByRole("button", { name: "Add match question" }).click();
  await captureQuestionMapResults(page, rootDir, toolId);
}

export async function captureMatchingQuestionHiders(page: Page, rootDir: string) {
  const toolId = "matching";

  await clickToolDockButton(page, "Matching");
  await placeHeavyToolAnchorAndAdvance(page);
  await selectCategoryOption(page, "museum");
  await waitForGeoLoadingIdle(page);
  await waitForWizardNext(page);
  await advanceWizard(page);
  await waitForGeoLoadingIdle(page);
  await assertTutorialCaptureReady(page, "hiders-send");
  await captureWizardStep(page, rootDir, toolId, "hiders", "resolve");
}

export async function captureMeasuringQuestionSolo(page: Page, rootDir: string) {
  const toolId = "measuring";

  await clickToolDockButton(page, "Measuring");
  await waitForMapPlacementCrosshair(page);
  await captureWizardStep(page, rootDir, toolId, "solo", "anchor");
  await clickMapCenter(page);
  await waitForWizardNext(page);
  await advanceWizard(page);
  await captureWizardStep(page, rootDir, toolId, "solo", "source");
  await selectCategoryOption(page, "museum");
  await waitForWizardNext(page);
  await advanceWizard(page);
  await captureWizardStep(page, rootDir, toolId, "solo", "target");
  await clickMapAt(page, 0.6, 0.4);
  await waitForWizardNext(page);
  await advanceWizard(page);
  await captureWizardStep(page, rootDir, toolId, "solo", "answer");
  await page.getByRole("button", { name: "Closer" }).click();
  await page.getByRole("button", { name: "Add measure question" }).click();
  await captureQuestionMapResults(page, rootDir, toolId);
}

export async function captureMeasuringQuestionHiders(page: Page, rootDir: string) {
  const toolId = "measuring";

  await clickToolDockButton(page, "Measuring");
  await placeHeavyToolAnchorAndAdvance(page);
  await selectCategoryOption(page, "museum");
  await waitForGeoLoadingIdle(page);
  await waitForWizardNext(page);
  await advanceWizard(page);
  await clickMapAt(page, 0.6, 0.4);
  await waitForGeoLoadingIdle(page);
  await assertTutorialCaptureReady(page, "hiders-send");
  await captureWizardStep(page, rootDir, toolId, "hiders", "target");
}

export async function captureThermometerQuestionSolo(page: Page, rootDir: string) {
  const toolId = "thermometer";

  await clickToolDockButton(page, "Thermometer");
  await captureWizardStep(page, rootDir, toolId, "solo", "distance");
  await page.getByRole("button", { name: "Manual pins" }).click();
  await advanceWizard(page);
  await captureWizardStep(page, rootDir, toolId, "solo", "placement");
  await clickMapAt(page, 0.35, 0.5);
  await clickMapAt(page, 0.65, 0.5);
  await waitForWizardNext(page);
  await advanceWizard(page);
  await captureWizardStep(page, rootDir, toolId, "solo", "answer");
  await page.getByRole("button", { name: "Hotter" }).click();
  await page.getByRole("button", { name: "Add thermometer" }).click();
  await captureQuestionMapResults(page, rootDir, toolId);
}

export async function captureThermometerQuestionHiders(page: Page, rootDir: string) {
  const toolId = "thermometer";

  await clickToolDockButton(page, "Thermometer");
  await page.getByRole("button", { name: "Manual pins" }).click();
  await advanceWizard(page);
  await clickMapAt(page, 0.35, 0.5);
  await clickMapAt(page, 0.65, 0.5);
  await captureWizardStep(page, rootDir, toolId, "hiders", "placement");
}

export async function captureRadarQuestionSolo(page: Page, rootDir: string) {
  const toolId = "radar";

  await clickToolDockButton(page, "Radar");
  await captureWizardStep(page, rootDir, toolId, "solo", "anchor");
  await clickMapCenter(page);
  await waitForWizardNext(page);
  await advanceWizard(page);
  await captureWizardStep(page, rootDir, toolId, "solo", "distance");
  await selectTutorialRadarDistance(page);
  await waitForWizardNext(page);
  await advanceWizard(page);
  await captureWizardStep(page, rootDir, toolId, "solo", "answer");
  await page.getByRole("button", { name: "Yes" }).click();
  await page.getByRole("button", { name: "Add radar question" }).click();
  await expect(page.getByRole("button", { name: "Add radar question" })).toBeHidden({
    timeout: 15_000,
  });
  await captureQuestionMapResults(page, rootDir, toolId);
}

export async function captureRadarQuestionHiders(page: Page, rootDir: string) {
  const toolId = "radar";

  await clickToolDockButton(page, "Radar");
  await clickMapCenter(page);
  await waitForWizardNext(page);
  await advanceWizard(page);
  await selectTutorialRadarDistance(page);
  await assertTutorialCaptureReady(page, "hiders-send");
  await captureWizardStep(page, rootDir, toolId, "hiders", "distance");
}

export async function captureTentacleQuestionSolo(page: Page, rootDir: string) {
  const toolId = "tentacle";

  await clickToolDockButton(page, "Tentacles");
  await waitForMapPlacementCrosshair(page);
  await captureWizardStep(page, rootDir, toolId, "solo", "anchor");
  await clickMapCenter(page);
  await waitForWizardNext(page);
  await advanceWizard(page);
  await expect(page.locator("select.field-input")).toBeVisible({ timeout: 15_000 });
  await captureWizardStep(page, rootDir, toolId, "solo", "category");
  await selectCategoryOption(page, "museum");
  await waitForWizardNext(page);
  await advanceWizard(page);
  await waitForGeoLoadingIdle(page);
  await captureWizardStep(page, rootDir, toolId, "solo", "locations");
  await waitForWizardNext(page);
  await advanceWizard(page);
  await captureWizardStep(page, rootDir, toolId, "solo", "answer");
  await page.getByText("City Museum").click();
  await page.getByRole("button", { name: "Add tentacle question" }).click();
  await captureQuestionMapResults(page, rootDir, toolId);
}

export async function captureTentacleQuestionHiders(page: Page, rootDir: string) {
  const toolId = "tentacle";

  await clickToolDockButton(page, "Tentacles");
  await placeHeavyToolAnchorAndAdvance(page);
  await selectCategoryOption(page, "museum");
  await waitForWizardNext(page);
  await advanceWizard(page);
  await waitForGeoLoadingIdle(page);
  await assertTutorialCaptureReady(page, "hiders-send");
  await captureWizardStep(page, rootDir, toolId, "hiders", "locations");
}

export async function capturePhotoQuestionNoHiders(page: Page, rootDir: string) {
  await captureToolDockStrip(
    page,
    tutorialQuestionAsset(rootDir, "photo", "wizard", "dock", "no-hiders.png"),
  );
}

export async function capturePhotoQuestionWithHiders(page: Page, rootDir: string) {
  await clickToolDockButton(page, "Photo");
  await expect(
    page.getByRole("button", { name: /^Send to hiders \(D\d+P\d+\)$/ }),
  ).toBeVisible({ timeout: 15_000 });
  await captureWizardStep(page, rootDir, "photo", "hiders", "panel");
}
