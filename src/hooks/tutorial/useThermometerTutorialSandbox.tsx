import { useCallback, useEffect, useState } from "react";
import { ThermometerPanel } from "../../components/tools/ThermometerPanel";
import { DEFAULT_THERMOMETER_DISTANCE_METERS } from "../../domain/questions";
import type { ThermometerAnswer } from "../../domain/questions/thermometerQuestions";
import type { LatLngTuple } from "../../domain/geometry/geometry";
import { DEFAULT_SESSION_RULES } from "../../domain/session/rules/types";
import type { ThermometerPreviewFixture } from "../../domain/wizard/previewFixtures/thermometer";
import {
  createTutorialSandbox,
  type TutorialSandboxContext,
} from "./createTutorialSandbox";
import { tutorialMapDraftBase } from "./tutorialMapDraftDefaults";

type PlacementMode = "gps" | "manual";
type MapPlacementStep = "a" | "b" | "ready";

function useThermometerSandboxBody({
  fixture,
  readOnly,
  interactive,
  committed,
  registerMapDraft,
  gameArea,
  costLabel,
  wizardProps,
}: TutorialSandboxContext<ThermometerPreviewFixture>) {
  const sessionRules = DEFAULT_SESSION_RULES;

  const [distanceMeters, setDistanceMeters] = useState(
    fixture?.distanceMeters ?? DEFAULT_THERMOMETER_DISTANCE_METERS,
  );
  const [placementMode, setPlacementMode] = useState<PlacementMode>(
    fixture?.placementMode ?? "manual",
  );
  const [answer, setAnswer] = useState<ThermometerAnswer | null>(
    fixture?.answer ?? null,
  );
  const [mapStep, setMapStep] = useState<MapPlacementStep>(
    fixture?.mapStep ?? "a",
  );
  const [walkingActive, setWalkingActive] = useState(
    fixture?.walkingActive ?? false,
  );
  const [thermoA, setThermoA] = useState<LatLngTuple | null>(null);
  const [thermoB, setThermoB] = useState<LatLngTuple | null>(null);

  const awaitHiderAnswer = fixture?.awaitHiderAnswer ?? false;
  const travelMeters = fixture?.travelMeters ?? null;
  const distanceUnit = sessionRules.distanceUnit ?? "imperial";

  const pathReady = mapStep === "ready";
  const canCommit = pathReady && (awaitHiderAnswer || answer !== null);

  const placeOnMap = useCallback(
    (lat: number, lng: number) => {
      if (readOnly || committed) {
        return;
      }

      const point: LatLngTuple = [lat, lng];
      if (mapStep === "a") {
        setThermoA(point);
        setThermoB(null);
        setAnswer(null);
        setMapStep("b");
        return;
      }

      if (mapStep === "b") {
        setThermoB(point);
        setAnswer(null);
        setMapStep("ready");
      }
    },
    [mapStep, readOnly, committed],
  );

  useEffect(() => {
    if (committed) {
      return;
    }
    if (readOnly || !interactive) {
      registerMapDraft(null);
      return;
    }

    registerMapDraft({
      activeTool: "thermometer",
      ...tutorialMapDraftBase(gameArea),
      thermometer: {
        thermoA,
        thermoB,
        answer,
        targetDistanceMeters: distanceMeters,
        walkCurrentPoint: null,
        walkActive: walkingActive,
      },
    });
  }, [
    answer,
    committed,
    distanceMeters,
    gameArea,
    interactive,
    readOnly,
    registerMapDraft,
    thermoA,
    thermoB,
    walkingActive,
  ]);

  return {
    canCommit,
    renderPanel: (commit: { handleCommit: () => void; isSubmitting: boolean }) => (
      <ThermometerPanel
        distanceUnit={distanceUnit}
        sessionRules={sessionRules}
        distanceMeters={distanceMeters}
        travelMeters={travelMeters}
        answer={answer}
        step={mapStep}
        presetUseCount={0}
        costLabel={costLabel}
        placementMode={placementMode}
        walkingActive={walkingActive}
        onPlacementModeChange={readOnly ? () => {} : setPlacementMode}
        onDistanceChange={readOnly ? () => {} : setDistanceMeters}
        onAnswerChange={readOnly ? () => {} : setAnswer}
        onReset={() => {
          if (readOnly) {
            return;
          }
          setMapStep("a");
          setThermoA(null);
          setThermoB(null);
          setAnswer(null);
          setWalkingActive(false);
        }}
        onStartWalk={() => {
          if (readOnly) {
            return;
          }
          setWalkingActive(true);
          setMapStep("ready");
        }}
        onCommit={interactive ? commit.handleCommit : () => {}}
        isSubmitting={commit.isSubmitting}
        awaitHiderAnswer={awaitHiderAnswer}
        canSubmitQuestion
        {...wizardProps}
      />
    ),
    extras: { placeOnMap, mapStep },
  };
}

export const useThermometerTutorialSandbox = createTutorialSandbox<
  ThermometerPreviewFixture,
  { placeOnMap: (lat: number, lng: number) => void; mapStep: MapPlacementStep }
>({
  toolId: "thermometer",
  requiresSession: false,
  useSandboxBody: useThermometerSandboxBody,
});
