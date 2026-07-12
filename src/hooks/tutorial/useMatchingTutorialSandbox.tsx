import { useEffect, useState } from "react";
import { MatchingPanel } from "../../components/tools/MatchingPanel";
import {
  isMatchingCategoryAvailable,
  type MatchingAnswer,
  type MatchingCategoryId,
} from "../../domain/questions";
import { DEFAULT_SESSION_RULES } from "../../domain/session/rules/types";
import type { LatLngTuple } from "../../domain/geometry/geometry";
import {
  buildTutorialMatchingPreviews,
  syntheticMatchingFeatures,
} from "../../domain/wizard/tutorialInteractiveMocks";
import type { MatchingPreviewFixture } from "../../domain/wizard/previewFixtures/matching";
import {
  createTutorialSandbox,
  type TutorialSandboxContext,
} from "./createTutorialSandbox";
import { tutorialMapDraftBase } from "./tutorialMapDraftDefaults";

function useMatchingSandboxBody({
  fixture,
  readOnly,
  interactive,
  session,
  registerMapDraft,
  gameArea,
  costLabel,
  wizardProps,
}: TutorialSandboxContext<MatchingPreviewFixture>) {
  const sessionRules = DEFAULT_SESSION_RULES;

  const [categoryId, setCategoryId] = useState<MatchingCategoryId | null>(
    fixture?.categoryId ?? null,
  );
  const [categoryChosen, setCategoryChosen] = useState(
    fixture?.categoryChosen ?? false,
  );
  const [answer, setAnswer] = useState<MatchingAnswer | null>(
    fixture?.answer ?? null,
  );

  const hasSeekerPoint = interactive
    ? (session?.hasAnchor ?? false)
    : (fixture?.hasSeekerPoint ?? false);
  const resolveComplete =
    fixture?.nullAnswer ||
    (interactive
      ? (session?.matchingNearestFeatureName ?? null) !== null
      : (fixture?.nearestFeatureName ?? null) !== null);
  const categoryAvailable =
    categoryId !== null && isMatchingCategoryAvailable(categoryId);
  const loading = interactive
    ? (session?.matchingLoading ?? false)
    : (fixture?.loading ?? false);
  const awaitHiderAnswer = fixture?.awaitHiderAnswer ?? false;

  const canCommit =
    hasSeekerPoint &&
    (awaitHiderAnswer || answer !== null) &&
    Boolean(resolveComplete) &&
    categoryAvailable &&
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

    if (live.matchingLoading || live.matchingDistanceMeters === null) {
      registerMapDraft({
        activeTool: "matching",
        ...tutorialMapDraftBase(gameArea),
        matching: {
          seekerPoint: pendingAnchor,
          nearestFeaturePoint: null,
          boundaryPreview: null,
          eliminationPreview: null,
          seekerResolving: live.matchingLoading,
        },
      });
      return;
    }

    const { features, nearestId, nearestPoint } =
      syntheticMatchingFeatures(pendingAnchor);
    const previews = buildTutorialMatchingPreviews(
      pendingAnchor,
      answer,
      gameArea,
      features,
      nearestId,
    );

    registerMapDraft({
      activeTool: "matching",
      ...tutorialMapDraftBase(gameArea),
      matching: {
        seekerPoint: pendingAnchor,
        nearestFeaturePoint: nearestPoint,
        boundaryPreview: previews.boundaryPreview,
        eliminationPreview: previews.eliminationPreview,
        seekerResolving: false,
      },
    });
  }, [
    answer,
    gameArea,
    interactive,
    readOnly,
    registerMapDraft,
    session,
  ]);

  return {
    canCommit,
    renderPanel: (commit: { handleCommit: () => void; isSubmitting: boolean }) => (
      <MatchingPanel
        distanceUnit={sessionRules.distanceUnit ?? "imperial"}
        categoryId={categoryId}
        categoryChosen={categoryChosen}
        usedCategoryIds={new Set()}
        anchorLat={
          interactive ? (session?.anchorLat ?? null) : (fixture?.anchorLat ?? null)
        }
        anchorLng={
          interactive ? (session?.anchorLng ?? null) : (fixture?.anchorLng ?? null)
        }
        usesContainmentMatching={fixture?.usesContainmentMatching ?? false}
        hasSeekerPoint={hasSeekerPoint}
        nearestFeatureName={
          interactive
            ? (session?.matchingNearestFeatureName ?? null)
            : (fixture?.nearestFeatureName ?? null)
        }
        distanceMeters={
          interactive
            ? (session?.matchingDistanceMeters ?? null)
            : (fixture?.distanceMeters ?? null)
        }
        featureCount={
          interactive
            ? (session?.matchingFeatureCount ?? null)
            : (fixture?.featureCount ?? null)
        }
        inPlayAreaFeatureCount={
          interactive
            ? (session?.matchingInPlayAreaFeatureCount ?? null)
            : (fixture?.inPlayAreaFeatureCount ?? null)
        }
        nearestOutsidePlayArea={fixture?.nearestOutsidePlayArea ?? false}
        nullAnswer={fixture?.nullAnswer ?? false}
        loading={loading}
        gpsLoading={interactive ? (session?.gpsLoading ?? false) : false}
        answer={answer}
        error={interactive ? (session?.gpsError ?? null) : null}
        onCategoryChange={(next) => {
          if (readOnly) {
            return;
          }
          setCategoryId(next);
          setCategoryChosen(true);
          setAnswer(null);
          if (interactive && session) {
            session.configureMock({ matchingCategoryId: next });
          }
        }}
        onUseGps={interactive && session ? session.useGps : () => {}}
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

export const useMatchingTutorialSandbox =
  createTutorialSandbox<MatchingPreviewFixture>({
    toolId: "matching",
    useSandboxBody: useMatchingSandboxBody,
  });
