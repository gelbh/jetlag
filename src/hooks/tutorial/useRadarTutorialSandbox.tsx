import { useEffect, useState } from "react";
import { RadarPanel } from "../../components/tools/RadarPanel";
import { parseDistanceInput } from "../../domain/map/distance";
import {
  isRadarRadiusAllowedForGameSize,
  type RadarAnswer,
} from "../../domain/questions";
import type { LatLngTuple } from "../../domain/geometry/geometry";
import { DEFAULT_SESSION_RULES } from "../../domain/session/rules/types";
import type { RadarPreviewFixture } from "../../domain/wizard/previewFixtures/radar";
import {
  createTutorialSandbox,
  type TutorialSandboxContext,
} from "./createTutorialSandbox";
import { tutorialMapDraftBase } from "./tutorialMapDraftDefaults";

function useRadarSandboxBody({
  fixture,
  readOnly,
  interactive,
  committed,
  session,
  registerMapDraft,
  gameArea,
  costLabel,
  wizardProps,
}: TutorialSandboxContext<RadarPreviewFixture>) {
  const sessionRules = DEFAULT_SESSION_RULES;

  const [answer, setAnswer] = useState<RadarAnswer | null>(
    fixture?.answer ?? null,
  );
  const [radiusMeters, setRadiusMeters] = useState<number | null>(
    fixture?.radiusMeters ?? null,
  );
  const [chooseCustom, setChooseCustom] = useState(fixture?.chooseCustom ?? false);
  const [customRadius, setCustomRadius] = useState(fixture?.customRadius ?? "");

  const distanceUnit = sessionRules.distanceUnit ?? "imperial";
  const gameSize = sessionRules.gameSize ?? "medium";
  const resolvedRadius = chooseCustom
    ? (parseDistanceInput(customRadius, distanceUnit) ?? radiusMeters)
    : radiusMeters;
  const hasCenter = interactive
    ? (session?.hasCenter ?? false)
    : (fixture?.hasCenter ?? false);
  const distanceSelectionAvailable =
    resolvedRadius !== null &&
    isRadarRadiusAllowedForGameSize(
      gameSize,
      resolvedRadius,
      distanceUnit,
      chooseCustom,
    );
  const awaitHiderAnswer = fixture?.awaitHiderAnswer ?? false;

  const canCommit =
    hasCenter &&
    distanceSelectionAvailable &&
    (awaitHiderAnswer || answer !== null);

  useEffect(() => {
    if (committed) {
      return;
    }
    if (readOnly || !interactive || session === null || !session.hasCenter) {
      registerMapDraft(null);
      return;
    }

    if (session.anchorLat === null || session.anchorLng === null) {
      registerMapDraft(null);
      return;
    }

    const center: LatLngTuple = [session.anchorLat, session.anchorLng];

    registerMapDraft({
      activeTool: "radar",
      ...tutorialMapDraftBase(gameArea),
      radar: {
        center,
        radiusMeters: resolvedRadius ?? 0,
        answer,
      },
    });
  }, [
    answer,
    committed,
    gameArea,
    interactive,
    readOnly,
    registerMapDraft,
    resolvedRadius,
    session,
  ]);

  return {
    canCommit,
    renderPanel: (commit: { handleCommit: () => void; isSubmitting: boolean }) => (
      <RadarPanel
        radiusMeters={radiusMeters}
        chooseCustom={chooseCustom}
        customRadius={customRadius}
        awaitingPlacement={
          interactive
            ? !(session?.hasCenter ?? false)
            : (fixture?.awaitingPlacement ?? true)
        }
        hasCenter={hasCenter}
        distanceUnit={distanceUnit}
        gameSize={gameSize}
        usedDistanceOptions={new Set()}
        answer={answer}
        onPresetSelect={(radius) => {
          if (readOnly) {
            return;
          }
          setRadiusMeters(radius);
          setChooseCustom(false);
          setAnswer(null);
        }}
        onChooseSelect={() => {
          if (readOnly) {
            return;
          }
          setChooseCustom(true);
        }}
        onCustomRadiusChange={(value) => {
          if (readOnly) {
            return;
          }
          setCustomRadius(value);
        }}
        onAnswerChange={readOnly ? () => {} : setAnswer}
        onUseGps={interactive && session ? session.useGps : () => {}}
        onPlaceAtMapTap={() => {}}
        onCommit={interactive ? commit.handleCommit : () => {}}
        isSubmitting={commit.isSubmitting}
        gpsLoading={interactive ? (session?.gpsLoading ?? false) : false}
        awaitHiderAnswer={awaitHiderAnswer}
        costLabel={costLabel}
        {...wizardProps}
      />
    ),
  };
}

export const useRadarTutorialSandbox = createTutorialSandbox<RadarPreviewFixture>({
  toolId: "radar",
  useSandboxBody: useRadarSandboxBody,
});
