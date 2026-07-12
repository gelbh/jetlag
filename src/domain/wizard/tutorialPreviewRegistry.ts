import type { QuestionTutorialId } from "../tutorial/tutorialQuestions";
import type { TutorialSplitPanelPreview } from "../tutorial/tutorialSections";
import type { MatchingPreviewFixture } from "./previewFixtures/matching";
import {
  MATCHING_PREVIEW_ANCHOR,
  MATCHING_PREVIEW_HIDERS_RESOLVE,
  MATCHING_PREVIEW_SOLO_ANSWER,
} from "./previewFixtures/matching";
import type { MeasuringPreviewFixture } from "./previewFixtures/measuring";
import {
  MEASURING_PREVIEW_ANCHOR,
  MEASURING_PREVIEW_HIDERS_TARGET,
  MEASURING_PREVIEW_SOLO_ANSWER,
} from "./previewFixtures/measuring";
import type { RadarPreviewFixture } from "./previewFixtures/radar";
import {
  RADAR_PREVIEW_ANCHOR,
  RADAR_PREVIEW_HIDERS_DISTANCE,
  RADAR_PREVIEW_SOLO_ANSWER,
} from "./previewFixtures/radar";
import type { TentaclePreviewFixture } from "./previewFixtures/tentacle";
import {
  TENTACLE_PREVIEW_ANCHOR,
  TENTACLE_PREVIEW_HIDERS_LOCATIONS,
  TENTACLE_PREVIEW_SOLO_ANSWER,
} from "./previewFixtures/tentacle";
import type { PhotoPreviewFixture } from "./previewFixtures/photo";
import {
  PHOTO_PREVIEW_INTERACTIVE,
  PHOTO_PREVIEW_NO_HIDERS,
  PHOTO_PREVIEW_WITH_HIDERS,
} from "./previewFixtures/photo";
import type { ThermometerPreviewFixture } from "./previewFixtures/thermometer";
import {
  THERMOMETER_PREVIEW_DISTANCE,
  THERMOMETER_PREVIEW_HIDERS_PLACEMENT,
  THERMOMETER_PREVIEW_SOLO_ANSWER,
} from "./previewFixtures/thermometer";

export function splitPanelFixture(
  toolId: "matching",
  awaitHiderAnswer: boolean,
): MatchingPreviewFixture;
export function splitPanelFixture(
  toolId: "measuring",
  awaitHiderAnswer: boolean,
): MeasuringPreviewFixture;
export function splitPanelFixture(
  toolId: "radar",
  awaitHiderAnswer: boolean,
): RadarPreviewFixture;
export function splitPanelFixture(
  toolId: "tentacle",
  awaitHiderAnswer: boolean,
): TentaclePreviewFixture;
export function splitPanelFixture(
  toolId: "thermometer",
  awaitHiderAnswer: boolean,
): ThermometerPreviewFixture;
export function splitPanelFixture(
  toolId: "photo",
  awaitHiderAnswer: boolean,
): PhotoPreviewFixture;
export function splitPanelFixture(
  toolId: QuestionTutorialId,
  awaitHiderAnswer: boolean,
) {
  switch (toolId) {
    case "matching":
      return awaitHiderAnswer
        ? MATCHING_PREVIEW_HIDERS_RESOLVE
        : MATCHING_PREVIEW_SOLO_ANSWER;
    case "measuring":
      return awaitHiderAnswer
        ? MEASURING_PREVIEW_HIDERS_TARGET
        : MEASURING_PREVIEW_SOLO_ANSWER;
    case "radar":
      return awaitHiderAnswer
        ? RADAR_PREVIEW_HIDERS_DISTANCE
        : RADAR_PREVIEW_SOLO_ANSWER;
    case "tentacle":
      return awaitHiderAnswer
        ? TENTACLE_PREVIEW_HIDERS_LOCATIONS
        : TENTACLE_PREVIEW_SOLO_ANSWER;
    case "thermometer":
      return awaitHiderAnswer
        ? THERMOMETER_PREVIEW_HIDERS_PLACEMENT
        : THERMOMETER_PREVIEW_SOLO_ANSWER;
    case "photo":
      return awaitHiderAnswer
        ? PHOTO_PREVIEW_WITH_HIDERS
        : PHOTO_PREVIEW_NO_HIDERS;
    default: {
      const _exhaustive: never = toolId;
      return _exhaustive;
    }
  }
}

export function interactivePanelFixture(
  toolId: "matching",
): MatchingPreviewFixture;
export function interactivePanelFixture(
  toolId: "measuring",
): MeasuringPreviewFixture;
export function interactivePanelFixture(toolId: "radar"): RadarPreviewFixture;
export function interactivePanelFixture(
  toolId: "tentacle",
): TentaclePreviewFixture;
export function interactivePanelFixture(
  toolId: "thermometer",
): ThermometerPreviewFixture;
export function interactivePanelFixture(toolId: "photo"): PhotoPreviewFixture;
export function interactivePanelFixture(toolId: QuestionTutorialId) {
  switch (toolId) {
    case "matching":
      return MATCHING_PREVIEW_ANCHOR;
    case "measuring":
      return MEASURING_PREVIEW_ANCHOR;
    case "radar":
      return RADAR_PREVIEW_ANCHOR;
    case "tentacle":
      return TENTACLE_PREVIEW_ANCHOR;
    case "thermometer":
      return THERMOMETER_PREVIEW_DISTANCE;
    case "photo":
      return PHOTO_PREVIEW_INTERACTIVE;
    default: {
      const _exhaustive: never = toolId;
      return _exhaustive;
    }
  }
}

export function splitPanelWizardStepId(
  toolId: QuestionTutorialId,
  compare: TutorialSplitPanelPreview,
  side: "left" | "right",
): string | undefined {
  if (toolId === "photo") {
    return undefined;
  }
  return side === "left"
    ? compare.leftWizardStepId
    : compare.rightWizardStepId;
}
