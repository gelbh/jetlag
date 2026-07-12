import { useEffect, useMemo, useState } from "react";
import { TentaclePanel } from "../../components/tools/TentaclePanel";
import {
  tentacleSearchRadiusMeters,
  type TentacleExtendedCategoryId,
} from "../../domain/questions";
import type { LatLngTuple } from "../../domain/geometry/geometry";
import { DEFAULT_SESSION_RULES } from "../../domain/session/rules/types";
import { buildTutorialTentacleElimination } from "../../domain/wizard/tutorialInteractiveMocks";
import type { TentaclePreviewFixture } from "../../domain/wizard/previewFixtures/tentacle";
import {
  createTutorialSandbox,
  type TutorialSandboxContext,
} from "./createTutorialSandbox";
import { tutorialMapDraftBase } from "./tutorialMapDraftDefaults";

function useTentacleSandboxBody({
  fixture,
  readOnly,
  interactive,
  committed,
  session,
  registerMapDraft,
  gameArea,
  costLabel,
  wizardProps,
}: TutorialSandboxContext<TentaclePreviewFixture>) {
  const sessionRules = DEFAULT_SESSION_RULES;
  const gameSize = sessionRules.gameSize ?? "medium";
  const distanceUnit = sessionRules.distanceUnit ?? "imperial";

  const [categoryId, setCategoryId] = useState<TentacleExtendedCategoryId | null>(
    fixture?.categoryId ?? null,
  );
  const [categoryChosen, setCategoryChosen] = useState(
    fixture?.categoryChosen ?? false,
  );
  const [selectedPoiId, setSelectedPoiId] = useState<string | null>(
    fixture?.selectedPoiId ?? null,
  );
  const [outOfReach, setOutOfReach] = useState(fixture?.outOfReach ?? false);

  const searchRadiusMeters =
    categoryId !== null
      ? tentacleSearchRadiusMeters(categoryId, gameSize)
      : (fixture?.searchRadiusMeters ??
        tentacleSearchRadiusMeters("museum", gameSize));

  const poiOptions = useMemo(
    () =>
      interactive
        ? (session?.tentaclePoiOptions ?? [])
        : (fixture?.poiOptions ?? []),
    [fixture?.poiOptions, interactive, session?.tentaclePoiOptions],
  );
  const hasCenter = interactive
    ? (session?.hasCenter ?? false)
    : (fixture?.hasCenter ?? false);
  const loading = interactive
    ? (session?.tentacleLoading ?? false)
    : (fixture?.loading ?? false);
  const awaitHiderAnswer = fixture?.awaitHiderAnswer ?? false;
  const hasRecordedAnswer = outOfReach || selectedPoiId !== null;

  const canCommit =
    categoryChosen &&
    categoryId !== null &&
    hasCenter &&
    poiOptions.length > 0 &&
    (awaitHiderAnswer || hasRecordedAnswer) &&
    !loading;

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
    const elimination = buildTutorialTentacleElimination(
      center,
      searchRadiusMeters,
      poiOptions,
      selectedPoiId,
      outOfReach,
      gameArea,
    );

    registerMapDraft(
      {
        activeTool: "tentacle",
        ...tutorialMapDraftBase(gameArea),
        tentacle: {
          center,
          searchRadiusMeters,
          answerRadiusMeters: searchRadiusMeters,
          pois: poiOptions,
          selectedPoiId,
          outOfReach,
          seekerResolving: loading,
        },
      },
      elimination ? [elimination] : [],
    );
  }, [
    committed,
    gameArea,
    interactive,
    loading,
    outOfReach,
    poiOptions,
    readOnly,
    registerMapDraft,
    searchRadiusMeters,
    selectedPoiId,
    session,
  ]);

  return {
    canCommit,
    renderPanel: (commit: { handleCommit: () => void; isSubmitting: boolean }) => (
      <TentaclePanel
        gameSize={gameSize}
        categoryId={categoryId}
        categoryChosen={categoryChosen}
        searchRadiusMeters={searchRadiusMeters}
        usedCategoryIds={new Set()}
        distanceUnit={distanceUnit}
        poiOptions={poiOptions}
        selectedPoiId={selectedPoiId}
        outOfReach={outOfReach}
        loading={loading}
        awaitingPlacement={
          interactive
            ? !(session?.hasCenter ?? false)
            : (fixture?.awaitingPlacement ?? true)
        }
        hasCenter={hasCenter}
        onCategoryChange={(next) => {
          if (readOnly) {
            return;
          }
          setCategoryId(next);
          setCategoryChosen(true);
          setSelectedPoiId(null);
          setOutOfReach(false);
          if (interactive && session) {
            session.configureMock({ tentacleCategoryId: next });
          }
        }}
        onUseGps={interactive && session ? session.useGps : () => {}}
        onPlaceAtMapTap={() => {}}
        onSelectPoi={readOnly ? () => {} : setSelectedPoiId}
        onOutOfReachChange={readOnly ? () => {} : setOutOfReach}
        onCommit={interactive ? commit.handleCommit : () => {}}
        isSubmitting={commit.isSubmitting}
        awaitHiderAnswer={awaitHiderAnswer}
        costLabel={costLabel}
        {...wizardProps}
      />
    ),
  };
}

export const useTentacleTutorialSandbox =
  createTutorialSandbox<TentaclePreviewFixture>({
    toolId: "tentacle",
    useSandboxBody: useTentacleSandboxBody,
  });
