import { useEffect, useState } from "react";
import { MeasuringPanel } from "../../components/tools/MeasuringPanel";
import {
  type MeasuringAnswer,
  type MeasuringFromKind,
  type MeasuringTargetMode,
} from "../../domain/questions";
import type { LatLngTuple } from "../../domain/geometry/geometry";
import { DEFAULT_SESSION_RULES } from "../../domain/session/rules/types";
import { buildTutorialMeasuringPreviews } from "../../domain/wizard/tutorialInteractiveMocks";
import type { MeasuringPreviewFixture } from "../../domain/wizard/previewFixtures/measuring";
import {
  createTutorialSandbox,
  type TutorialSandboxContext,
} from "./createTutorialSandbox";
import { tutorialMapDraftBase } from "./tutorialMapDraftDefaults";

function useMeasuringSandboxBody({
  fixture,
  readOnly,
  interactive,
  session,
  registerMapDraft,
  gameArea,
  costLabel,
  wizardProps,
}: TutorialSandboxContext<MeasuringPreviewFixture>) {
  const sessionRules = DEFAULT_SESSION_RULES;

  const [answer, setAnswer] = useState<MeasuringAnswer | null>(
    fixture?.answer ?? null,
  );
  const [optionChosen, setOptionChosen] = useState(fixture?.optionChosen ?? false);
  const [measureFrom, setMeasureFrom] = useState<MeasuringFromKind>(
    fixture?.measureFrom ?? "park",
  );
  const [targetMode, setTargetMode] = useState<MeasuringTargetMode>(
    fixture?.targetMode ?? "map",
  );

  const subject = fixture?.subject ?? "location";

  const hasSeekerPoint = interactive
    ? (session?.hasAnchor ?? false)
    : (fixture?.hasSeekerPoint ?? false);
  const hasTargetPoint = interactive
    ? (session?.measuringTargetPlaceName ?? null) !== null
    : (fixture?.hasTargetPoint ?? false);
  const distanceMeters = interactive
    ? (session?.measuringDistanceMeters ?? null)
    : (fixture?.distanceMeters ?? null);
  const loading = interactive
    ? (session?.measuringLoading ?? false)
    : (fixture?.loading ?? false);
  const awaitHiderAnswer = fixture?.awaitHiderAnswer ?? false;

  const canCommit =
    hasSeekerPoint &&
    hasTargetPoint &&
    distanceMeters !== null &&
    (awaitHiderAnswer || answer !== null) &&
    !loading;

  useEffect(() => {
    if (readOnly || !interactive || session === null || !session.hasAnchor) {
      registerMapDraft(null);
      return;
    }

    const live = session;

    if (live.anchorLat === null || live.anchorLng === null) {
      registerMapDraft(null);
      return;
    }

    const pendingAnchor: LatLngTuple = [live.anchorLat, live.anchorLng];

    if (live.measuringLoading || live.measuringDistanceMeters === null) {
      registerMapDraft({
        activeTool: "measuring",
        ...tutorialMapDraftBase(gameArea),
        measuring: {
          seekerPoint: pendingAnchor,
          targetPoint: null,
          placePoints: [],
          siteRadiusMeters: null,
          boundaryPreview: null,
          eliminationPreview: null,
          seekerResolving: live.measuringLoading,
        },
      });
      return;
    }

    const previews = buildTutorialMeasuringPreviews(
      pendingAnchor,
      measureFrom,
      live.measuringDistanceMeters,
      answer,
      gameArea,
    );

    registerMapDraft({
      activeTool: "measuring",
      ...tutorialMapDraftBase(gameArea),
      measuring: {
        seekerPoint: pendingAnchor,
        targetPoint: previews.targetPoint,
        placePoints: [],
        siteRadiusMeters: live.measuringDistanceMeters,
        boundaryPreview: previews.boundaryPreview,
        eliminationPreview: previews.eliminationPreview,
        seekerResolving: false,
      },
    });
  }, [
    answer,
    gameArea,
    interactive,
    measureFrom,
    readOnly,
    registerMapDraft,
    session,
  ]);

  return {
    canCommit,
    renderPanel: (commit: { handleCommit: () => void; isSubmitting: boolean }) => (
      <MeasuringPanel
        distanceUnit={sessionRules.distanceUnit ?? "imperial"}
        optionChosen={interactive ? optionChosen : (fixture?.optionChosen ?? false)}
        measureFrom={measureFrom}
        usesAllPlacesInArea={fixture?.usesAllPlacesInArea ?? false}
        usedMeasuringFromKinds={new Set()}
        anchorLat={
          interactive ? (session?.anchorLat ?? null) : (fixture?.anchorLat ?? null)
        }
        anchorLng={
          interactive ? (session?.anchorLng ?? null) : (fixture?.anchorLng ?? null)
        }
        subject={subject}
        targetMode={targetMode}
        anchorAltitudeMeters={null}
        hasSeekerPoint={hasSeekerPoint}
        hasTargetPoint={hasTargetPoint}
        seekerPlaceName={fixture?.seekerPlaceName ?? null}
        targetPlaceName={
          interactive
            ? (session?.measuringTargetPlaceName ?? null)
            : (fixture?.targetPlaceName ?? null)
        }
        distanceMeters={distanceMeters}
        loading={loading}
        gpsLoading={interactive ? (session?.gpsLoading ?? false) : false}
        searchQuery=""
        searchResults={[]}
        searchLoading={false}
        searchRole="seeker"
        answer={answer}
        onMeasureFromChange={(kind) => {
          if (readOnly) {
            return;
          }
          setMeasureFrom(kind);
          setOptionChosen(true);
          setAnswer(null);
          if (interactive && session) {
            session.configureMock({ measuringFromKind: kind });
          }
        }}
        onTargetModeChange={(mode) => {
          if (readOnly) {
            return;
          }
          setTargetMode(mode);
        }}
        onSearchQueryChange={() => {}}
        onSearchSubmit={() => {}}
        onSearchResultSelect={() => {}}
        onUseGps={interactive && session ? session.useGps : () => {}}
        onFindCoastline={() => {}}
        onRetrySeaLevel={() => {}}
        onFindLinearFeature={() => {}}
        onFindNearest={() => {}}
        onAnswerChange={readOnly ? () => {} : setAnswer}
        onCommit={interactive ? commit.handleCommit : () => {}}
        isSubmitting={commit.isSubmitting}
        awaitHiderAnswer={awaitHiderAnswer}
        costLabel={costLabel}
        {...wizardProps}
      />
    ),
  };
}

export const useMeasuringTutorialSandbox =
  createTutorialSandbox<MeasuringPreviewFixture>({
    toolId: "measuring",
    useSandboxBody: useMeasuringSandboxBody,
  });
