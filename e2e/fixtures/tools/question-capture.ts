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

type CaptureMode = "solo" | "hiders" | "dock";

type CaptureStep =
  | { kind: "openTool"; label: string }
  | { kind: "capture"; stepId: string; mode: CaptureMode }
  | { kind: "waitCrosshair" }
  | { kind: "clickCenter" }
  | { kind: "clickAt"; x: number; y: number }
  | { kind: "advance" }
  | { kind: "selectCategory"; id: string }
  | { kind: "selectRadarDistance" }
  | { kind: "answer"; label: string }
  | { kind: "submit"; label: string }
  | { kind: "waitGeoIdle" }
  | { kind: "waitHidersSend" }
  | { kind: "mapResults" }
  | { kind: "thermometerManualPins" }
  | { kind: "clickText"; text: string }
  | { kind: "expectCategorySelect" }
  | { kind: "expectSubmitHidden"; label: string }
  | { kind: "dockNoHiders" }
  | { kind: "expectSendToHiders" };

const TOOL_DOCK_LABELS = {
  matching: "Matching",
  measuring: "Measuring",
  thermometer: "Thermometer",
  radar: "Radar",
  tentacle: "Tentacles",
  photo: "Photo",
} as const;

type QuestionToolId = keyof typeof TOOL_DOCK_LABELS;

async function captureWizardStep(
  page: Page,
  rootDir: string,
  toolId: string,
  mode: CaptureMode,
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

async function runCaptureRecipe(
  page: Page,
  rootDir: string,
  toolId: QuestionToolId,
  steps: readonly CaptureStep[],
) {
  for (const step of steps) {
    switch (step.kind) {
      case "openTool":
        await clickToolDockButton(page, step.label);
        break;
      case "capture":
        await captureWizardStep(page, rootDir, toolId, step.mode, step.stepId);
        break;
      case "waitCrosshair":
        await waitForMapPlacementCrosshair(page);
        break;
      case "clickCenter":
        await clickMapCenter(page);
        break;
      case "clickAt":
        await clickMapAt(page, step.x, step.y);
        break;
      case "advance":
        await waitForWizardNext(page);
        await advanceWizard(page);
        break;
      case "selectCategory":
        await selectCategoryOption(page, step.id);
        break;
      case "selectRadarDistance":
        await selectTutorialRadarDistance(page);
        break;
      case "answer":
        await page.getByRole("button", { name: step.label }).click();
        break;
      case "submit":
        await page.getByRole("button", { name: step.label }).click();
        break;
      case "waitGeoIdle":
        await waitForGeoLoadingIdle(page);
        break;
      case "waitHidersSend":
        await assertTutorialCaptureReady(page, "hiders-send");
        break;
      case "mapResults":
        await captureQuestionMapResults(page, rootDir, toolId);
        break;
      case "thermometerManualPins":
        await page.getByRole("button", { name: "Manual pins" }).click();
        await advanceWizard(page);
        break;
      case "clickText":
        await page.getByText(step.text).click();
        break;
      case "expectCategorySelect":
        await expect(page.locator("select.field-input")).toBeVisible({
          timeout: 15_000,
        });
        break;
      case "expectSubmitHidden":
        await expect(
          page.getByRole("button", { name: step.label }),
        ).toBeHidden({ timeout: 15_000 });
        break;
      case "dockNoHiders":
        await captureToolDockStrip(
          page,
          tutorialQuestionAsset(rootDir, toolId, "wizard", "dock", "no-hiders.png"),
        );
        break;
      case "expectSendToHiders":
        await expect(
          page.getByRole("button", { name: /^Send to hiders \(D\d+P\d+\)$/ }),
        ).toBeVisible({ timeout: 15_000 });
        break;
      default: {
        const _exhaustive: never = step;
        return _exhaustive;
      }
    }
  }
}

const SOLO_RECIPES: Record<QuestionToolId, readonly CaptureStep[]> = {
  matching: [
    { kind: "openTool", label: TOOL_DOCK_LABELS.matching },
    { kind: "waitCrosshair" },
    { kind: "capture", stepId: "anchor", mode: "solo" },
    { kind: "clickCenter" },
    { kind: "advance" },
    { kind: "capture", stepId: "category", mode: "solo" },
    { kind: "selectCategory", id: "museum" },
    { kind: "advance" },
    { kind: "waitGeoIdle" },
    { kind: "capture", stepId: "resolve", mode: "solo" },
    { kind: "advance" },
    { kind: "capture", stepId: "answer", mode: "solo" },
    { kind: "answer", label: "Yes" },
    { kind: "submit", label: "Add match question" },
    { kind: "mapResults" },
  ],
  measuring: [
    { kind: "openTool", label: TOOL_DOCK_LABELS.measuring },
    { kind: "waitCrosshair" },
    { kind: "capture", stepId: "anchor", mode: "solo" },
    { kind: "clickCenter" },
    { kind: "advance" },
    { kind: "capture", stepId: "source", mode: "solo" },
    { kind: "selectCategory", id: "museum" },
    { kind: "advance" },
    { kind: "capture", stepId: "target", mode: "solo" },
    { kind: "clickAt", x: 0.6, y: 0.4 },
    { kind: "advance" },
    { kind: "capture", stepId: "answer", mode: "solo" },
    { kind: "answer", label: "Closer" },
    { kind: "submit", label: "Add measure question" },
    { kind: "mapResults" },
  ],
  thermometer: [
    { kind: "openTool", label: TOOL_DOCK_LABELS.thermometer },
    { kind: "capture", stepId: "distance", mode: "solo" },
    { kind: "thermometerManualPins" },
    { kind: "capture", stepId: "placement", mode: "solo" },
    { kind: "clickAt", x: 0.35, y: 0.5 },
    { kind: "clickAt", x: 0.65, y: 0.5 },
    { kind: "advance" },
    { kind: "capture", stepId: "answer", mode: "solo" },
    { kind: "answer", label: "Hotter" },
    { kind: "submit", label: "Add thermometer" },
    { kind: "mapResults" },
  ],
  radar: [
    { kind: "openTool", label: TOOL_DOCK_LABELS.radar },
    { kind: "capture", stepId: "anchor", mode: "solo" },
    { kind: "clickCenter" },
    { kind: "advance" },
    { kind: "capture", stepId: "distance", mode: "solo" },
    { kind: "selectRadarDistance" },
    { kind: "advance" },
    { kind: "capture", stepId: "answer", mode: "solo" },
    { kind: "answer", label: "Yes" },
    { kind: "submit", label: "Add radar question" },
    { kind: "expectSubmitHidden", label: "Add radar question" },
    { kind: "mapResults" },
  ],
  tentacle: [
    { kind: "openTool", label: TOOL_DOCK_LABELS.tentacle },
    { kind: "waitCrosshair" },
    { kind: "capture", stepId: "anchor", mode: "solo" },
    { kind: "clickCenter" },
    { kind: "advance" },
    { kind: "expectCategorySelect" },
    { kind: "capture", stepId: "category", mode: "solo" },
    { kind: "selectCategory", id: "museum" },
    { kind: "advance" },
    { kind: "waitGeoIdle" },
    { kind: "capture", stepId: "locations", mode: "solo" },
    { kind: "advance" },
    { kind: "capture", stepId: "answer", mode: "solo" },
    { kind: "clickText", text: "City Museum" },
    { kind: "submit", label: "Add tentacle question" },
    { kind: "mapResults" },
  ],
  photo: [],
};

const HIDERS_RECIPES: Record<QuestionToolId, readonly CaptureStep[]> = {
  matching: [
    { kind: "openTool", label: TOOL_DOCK_LABELS.matching },
    { kind: "waitCrosshair" },
    { kind: "clickCenter" },
    { kind: "advance" },
    { kind: "selectCategory", id: "museum" },
    { kind: "waitGeoIdle" },
    { kind: "advance" },
    { kind: "waitGeoIdle" },
    { kind: "waitHidersSend" },
    { kind: "capture", stepId: "resolve", mode: "hiders" },
  ],
  measuring: [
    { kind: "openTool", label: TOOL_DOCK_LABELS.measuring },
    { kind: "waitCrosshair" },
    { kind: "clickCenter" },
    { kind: "advance" },
    { kind: "selectCategory", id: "museum" },
    { kind: "waitGeoIdle" },
    { kind: "advance" },
    { kind: "clickAt", x: 0.6, y: 0.4 },
    { kind: "waitGeoIdle" },
    { kind: "waitHidersSend" },
    { kind: "capture", stepId: "target", mode: "hiders" },
  ],
  thermometer: [
    { kind: "openTool", label: TOOL_DOCK_LABELS.thermometer },
    { kind: "thermometerManualPins" },
    { kind: "clickAt", x: 0.35, y: 0.5 },
    { kind: "clickAt", x: 0.65, y: 0.5 },
    { kind: "capture", stepId: "placement", mode: "hiders" },
  ],
  radar: [
    { kind: "openTool", label: TOOL_DOCK_LABELS.radar },
    { kind: "clickCenter" },
    { kind: "advance" },
    { kind: "selectRadarDistance" },
    { kind: "waitHidersSend" },
    { kind: "capture", stepId: "distance", mode: "hiders" },
  ],
  tentacle: [
    { kind: "openTool", label: TOOL_DOCK_LABELS.tentacle },
    { kind: "waitCrosshair" },
    { kind: "clickCenter" },
    { kind: "advance" },
    { kind: "selectCategory", id: "museum" },
    { kind: "advance" },
    { kind: "waitGeoIdle" },
    { kind: "waitHidersSend" },
    { kind: "capture", stepId: "locations", mode: "hiders" },
  ],
  photo: [
    { kind: "openTool", label: TOOL_DOCK_LABELS.photo },
    { kind: "expectSendToHiders" },
    { kind: "capture", stepId: "panel", mode: "hiders" },
  ],
};

async function captureQuestionSolo(page: Page, rootDir: string, toolId: QuestionToolId) {
  await runCaptureRecipe(page, rootDir, toolId, SOLO_RECIPES[toolId]);
}

async function captureQuestionHiders(page: Page, rootDir: string, toolId: QuestionToolId) {
  await runCaptureRecipe(page, rootDir, toolId, HIDERS_RECIPES[toolId]);
}

export async function captureMatchingQuestionSolo(page: Page, rootDir: string) {
  await captureQuestionSolo(page, rootDir, "matching");
}

export async function captureMatchingQuestionHiders(page: Page, rootDir: string) {
  await captureQuestionHiders(page, rootDir, "matching");
}

export async function captureMeasuringQuestionSolo(page: Page, rootDir: string) {
  await captureQuestionSolo(page, rootDir, "measuring");
}

export async function captureMeasuringQuestionHiders(page: Page, rootDir: string) {
  await captureQuestionHiders(page, rootDir, "measuring");
}

export async function captureThermometerQuestionSolo(page: Page, rootDir: string) {
  await captureQuestionSolo(page, rootDir, "thermometer");
}

export async function captureThermometerQuestionHiders(page: Page, rootDir: string) {
  await captureQuestionHiders(page, rootDir, "thermometer");
}

export async function captureRadarQuestionSolo(page: Page, rootDir: string) {
  await captureQuestionSolo(page, rootDir, "radar");
}

export async function captureRadarQuestionHiders(page: Page, rootDir: string) {
  await captureQuestionHiders(page, rootDir, "radar");
}

export async function captureTentacleQuestionSolo(page: Page, rootDir: string) {
  await captureQuestionSolo(page, rootDir, "tentacle");
}

export async function captureTentacleQuestionHiders(page: Page, rootDir: string) {
  await captureQuestionHiders(page, rootDir, "tentacle");
}

export async function capturePhotoQuestionNoHiders(page: Page, rootDir: string) {
  await runCaptureRecipe(page, rootDir, "photo", [{ kind: "dockNoHiders" }]);
}

export async function capturePhotoQuestionWithHiders(page: Page, rootDir: string) {
  await captureQuestionHiders(page, rootDir, "photo");
}

export const QUESTION_SOLO_CAPTURES = [
  ["matching", captureMatchingQuestionSolo],
  ["measuring", captureMeasuringQuestionSolo],
  ["thermometer", captureThermometerQuestionSolo],
  ["radar", captureRadarQuestionSolo],
  ["tentacle", captureTentacleQuestionSolo],
] as const;

export const QUESTION_HIDERS_CAPTURES = [
  ["matching", captureMatchingQuestionHiders],
  ["measuring", captureMeasuringQuestionHiders],
  ["thermometer", captureThermometerQuestionHiders],
  ["radar", captureRadarQuestionHiders],
  ["tentacle", captureTentacleQuestionHiders],
] as const;
