import type { ReactNode } from "react";
import type { QuestionTutorialId } from "../../domain/tutorial/tutorialQuestions";
import {
  interactivePanelFixture,
  splitPanelFixture,
} from "../../domain/wizard/tutorialPreviewRegistry";
import { useMatchingTutorialSandbox } from "./useMatchingTutorialSandbox";
import { useMeasuringTutorialSandbox } from "./useMeasuringTutorialSandbox";
import { usePhotoTutorialSandbox } from "./usePhotoTutorialSandbox";
import { useRadarTutorialSandbox } from "./useRadarTutorialSandbox";
import { useTentacleTutorialSandbox } from "./useTentacleTutorialSandbox";
import { useThermometerTutorialSandbox } from "./useThermometerTutorialSandbox";

export type TutorialSandboxFixtureRequest =
  | { kind: "split"; awaitHiderAnswer: boolean }
  | { kind: "interactive" };

export interface TutorialSandboxHookOptions {
  readOnly: boolean;
  fixtureRequest: TutorialSandboxFixtureRequest;
  initialWizardStepId?: string;
  syncWizardStep?: boolean;
}

export interface TutorialSandboxHookResult {
  panel: ReactNode;
  placeOnMap?: (lat: number, lng: number) => void;
  mapStep?: "a" | "b" | "ready";
}

export type TutorialSandboxHook = (
  options: TutorialSandboxHookOptions,
) => TutorialSandboxHookResult;

/**
 * One sandbox hook per question tool, keyed for lookup from the tutorial
 * preview components. Callers must remount (e.g. via key) when the tool
 * changes, since each entry calls a different underlying hook.
 */
export const TUTORIAL_SANDBOX_HOOKS: Record<QuestionTutorialId, TutorialSandboxHook> = {
  matching: function useMatchingSandboxEntry(options) {
    return useMatchingTutorialSandbox({
      readOnly: options.readOnly,
      fixture:
        options.fixtureRequest.kind === "split"
          ? splitPanelFixture("matching", options.fixtureRequest.awaitHiderAnswer)
          : interactivePanelFixture("matching"),
      initialWizardStepId: options.initialWizardStepId,
      syncWizardStep: options.syncWizardStep,
    });
  },
  measuring: function useMeasuringSandboxEntry(options) {
    return useMeasuringTutorialSandbox({
      readOnly: options.readOnly,
      fixture:
        options.fixtureRequest.kind === "split"
          ? splitPanelFixture("measuring", options.fixtureRequest.awaitHiderAnswer)
          : interactivePanelFixture("measuring"),
      initialWizardStepId: options.initialWizardStepId,
      syncWizardStep: options.syncWizardStep,
    });
  },
  radar: function useRadarSandboxEntry(options) {
    return useRadarTutorialSandbox({
      readOnly: options.readOnly,
      fixture:
        options.fixtureRequest.kind === "split"
          ? splitPanelFixture("radar", options.fixtureRequest.awaitHiderAnswer)
          : interactivePanelFixture("radar"),
      initialWizardStepId: options.initialWizardStepId,
      syncWizardStep: options.syncWizardStep,
    });
  },
  tentacle: function useTentacleSandboxEntry(options) {
    return useTentacleTutorialSandbox({
      readOnly: options.readOnly,
      fixture:
        options.fixtureRequest.kind === "split"
          ? splitPanelFixture("tentacle", options.fixtureRequest.awaitHiderAnswer)
          : interactivePanelFixture("tentacle"),
      initialWizardStepId: options.initialWizardStepId,
      syncWizardStep: options.syncWizardStep,
    });
  },
  thermometer: function useThermometerSandboxEntry(options) {
    return useThermometerTutorialSandbox({
      readOnly: options.readOnly,
      fixture:
        options.fixtureRequest.kind === "split"
          ? splitPanelFixture(
              "thermometer",
              options.fixtureRequest.awaitHiderAnswer,
            )
          : interactivePanelFixture("thermometer"),
      initialWizardStepId: options.initialWizardStepId,
      syncWizardStep: options.syncWizardStep,
    });
  },
  photo: function usePhotoSandboxEntry(options) {
    return usePhotoTutorialSandbox({
      readOnly: options.readOnly,
      fixture:
        options.fixtureRequest.kind === "split"
          ? splitPanelFixture("photo", options.fixtureRequest.awaitHiderAnswer)
          : interactivePanelFixture("photo"),
    });
  },
};
