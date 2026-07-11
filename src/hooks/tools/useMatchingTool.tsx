import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLatestRequest } from "../useLatestRequest";
import { useDebouncedValue } from "../useDebouncedValue";
import { useSubmitLock } from "../useSubmitLock";
import type {
  Feature,
  MultiPolygon,
  Point,
  Polygon as GeoPolygon,
} from "geojson";
import { MatchingPanel } from "../../components/tools/MatchingPanel";
import { overpassErrorMessage } from "../../services/core/overpassClient";
import type { GameArea } from "../../domain/map/annotations";
import { isActive, type AnnotationRecord } from "../../domain/map/annotations";
import type { LatLngTuple } from "../../domain/geometry/geometry";
import {
  buildMatchingEliminationRegion,
  buildSameNearestRegion,
} from "../../domain/geometry/matchingGeometry";
import {
  defaultMatchingCategoryId,
  firstAvailableMatchingCategoryId,
  getMatchingCategory,
  isMatchingCategoryAvailable,
  isMatchingCategoryEnabled,
  matchingCategoryUseCount,
  matchingCategoryUseCountFromPending,
  matchingQuestionFor,
  usedMatchingCategoryIds,
  type MatchingAnswer,
  type MatchingCategoryId,
} from "../../domain/questions/matchingQuestions";
import { resolveMatchingCategory } from "../../domain/session/sessionCustomCatalog";
import {
  availableMatchingCategories,
  isPreviewQuestionBeforeSendEnabled,
} from "../../domain/session/sessionCatalogAvailability";
import { isAdminDivisionCategoryAvailable } from "../../services/geo/adminDivisionAvailability";
import { usePreloadStore } from "../../state/preloadStore";
import { QuestionPreviewSheet } from "../../components/tools/shared/QuestionPreviewSheet";
import { questionCostBreakdown } from "../../domain/questions/questionRules";
import type { PendingQuestionRecord } from "../../domain/session/sessionChat";
import type { SessionRulesInput } from "../../domain/session/sessionRules";
import type { MatchingFetchOptions } from "../../services/geo/matchingFeatures";
import { sessionCustomContentFromRules } from "../../domain/session/sessionCustomCatalog";
import { yesNoAnswerOptions } from "../../components/tools/shared/binaryAnswerOptions";
import type { SubmitPendingQuestionInput } from "../../hooks/sync/usePendingQuestionActions";
import type { DistanceUnit } from "../../domain/map/distance";
import {
  fetchMatchingFeaturesInArea,
  countMatchingFeaturesInPlayArea,
  matchingResolveFailureMessage,
  pickMatchingFeatureForAnchor,
  serializeMatchingFeatures,
  type MatchingFeature,
} from "../../services/geo/matchingFeatures";
import { useToolSessionOptions } from "./useToolSessionOptions";
import { MAP_ANNOTATION_COLORS } from "../../domain/map/mapAnnotationColors";

interface UseMatchingToolParams {
  active: boolean;
  annotations: AnnotationRecord[];
  pendingQuestions?: readonly PendingQuestionRecord[];
  gameArea: GameArea;
  createAnnotation: (
    annotation: Omit<AnnotationRecord, "id" | "sessionId" | "status">,
  ) => Promise<AnnotationRecord>;
  awaitHiderAnswer?: boolean;
  submitPendingQuestion?: (
    input: Omit<
      SubmitPendingQuestionInput,
      "sessionId" | "senderUid" | "senderRole" | "toolType"
    >,
  ) => Promise<void>;
  sessionId?: string;
  senderUid?: string | null;
  sessionRules?: SessionRulesInput;
  distanceUnit: DistanceUnit;
  finishPlacement: () => void;
  gpsLoading: boolean;
  gpsError?: string | null;
  mapError: string | null;
  refreshGps: () => Promise<{ lat: number; lng: number }>;
  ensurePointInGameArea: (point: LatLngTuple) => boolean;
  canSubmitQuestion?: boolean;
}

export function useMatchingTool({
  active,
  annotations,
  pendingQuestions = [],
  gameArea,
  createAnnotation,
  awaitHiderAnswer = false,
  submitPendingQuestion,
  sessionId,
  senderUid,
  sessionRules,
  distanceUnit,
  finishPlacement,
  gpsLoading,
  gpsError,
  mapError,
  refreshGps,
  ensurePointInGameArea,
  canSubmitQuestion = true,
}: UseMatchingToolParams) {
  const { isSubmitting, runLocked } = useSubmitLock();
  const wizardStepRef = useRef("anchor");
  const usedMatchingCategories = useMemo(
    () => usedMatchingCategoryIds(annotations.filter(isActive)),
    [annotations],
  );
  const [matchingSeekerPoint, setMatchingSeekerPoint] =
    useState<LatLngTuple | null>(null);
  const [matchingCategoryId, setMatchingCategoryId] =
    useState<MatchingCategoryId | null>(null);
  const [matchingCategoryChosen, setMatchingCategoryChosen] = useState(false);
  const matchingUseCount = matchingCategoryId
    ? Math.max(
        matchingCategoryUseCount(
          annotations.filter(isActive),
          matchingCategoryId,
        ),
        matchingCategoryUseCountFromPending(
          pendingQuestions,
          matchingCategoryId,
        ),
      )
    : 0;
  const { label: costLabel, draw: cardDraw, keep: cardKeep } =
    questionCostBreakdown("D3P1", matchingUseCount);
  const [matchingFeatures, setMatchingFeatures] = useState<MatchingFeature[]>(
    [],
  );
  const [matchingNearestFeatureId, setMatchingNearestFeatureId] = useState<
    string | null
  >(null);
  const [matchingNearestFeatureName, setMatchingNearestFeatureName] = useState<
    string | null
  >(null);
  const [matchingNearestFeaturePoint, setMatchingNearestFeaturePoint] =
    useState<LatLngTuple | null>(null);
  const [matchingDistanceMeters, setMatchingDistanceMeters] = useState<
    number | null
  >(null);
  const [matchingFeatureCount, setMatchingFeatureCount] = useState<
    number | null
  >(null);
  const [matchingInPlayAreaFeatureCount, setMatchingInPlayAreaFeatureCount] =
    useState<number | null>(null);
  const [matchingNearestOutsidePlayArea, setMatchingNearestOutsidePlayArea] =
    useState(false);
  const [matchingNullAnswer, setMatchingNullAnswer] = useState(false);
  const [matchingAnswer, setMatchingAnswer] = useState<MatchingAnswer | null>(
    null,
  );
  const [matchingLoading, setMatchingLoading] = useState(false);
  const [matchingError, setMatchingError] = useState<string | null>(null);

  const matchingFetchOptions = useMemo((): MatchingFetchOptions => {
    const content = sessionRules
      ? sessionCustomContentFromRules(sessionRules)
      : {
          customMatchingAreas: undefined,
          customCategories: [],
          customLocationPins: [],
        };
    return {
      customMatchingAreas: content.customMatchingAreas,
      customCategories: content.customCategories,
    };
  }, [sessionRules]);

  const customCategories = matchingFetchOptions.customCategories ?? [];
  const matchingCategory = matchingCategoryId
    ? (resolveMatchingCategory(matchingCategoryId, customCategories) ??
      getMatchingCategory(matchingCategoryId))
    : null;
  const matchingUsesContainment =
    matchingCategory?.resolver === "reverseGeocodeAdmin" ||
    matchingCategory?.resolver === "letterZone" ||
    matchingCategory?.resolver === "landmass";

  const adminDivisionCounts = usePreloadStore((state) => state.adminDivisionCounts);
  const regionPackId = sessionRules?.regionPackId;

  const matchingCatalog = useMemo(
    () => {
      const categories = sessionRules
        ? availableMatchingCategories(sessionRules)
        : availableMatchingCategories({ gameSize: "medium" });
      return categories.filter((category) =>
        isAdminDivisionCategoryAvailable(
          category.id,
          adminDivisionCounts,
          regionPackId,
        ),
      );
    },
    [adminDivisionCounts, regionPackId, sessionRules],
  );

  const previewBeforeSend = isPreviewQuestionBeforeSendEnabled(
    sessionRules ?? { gameSize: "medium" },
  );
  const [previewOpen, setPreviewOpen] = useState(false);

  useToolSessionOptions({
    active: active && matchingCategoryId !== null,
    usedOptions: usedMatchingCategories,
    currentOption: matchingCategoryId ?? defaultMatchingCategoryId(),
    isAvailable: (_usedOptions, currentOption) =>
      isMatchingCategoryAvailable(currentOption) &&
      isAdminDivisionCategoryAvailable(
        currentOption,
        adminDivisionCounts,
        regionPackId,
      ),
    pickNext: firstAvailableMatchingCategoryId,
    onUnavailable: useCallback((nextCategory: MatchingCategoryId) => {
      setMatchingCategoryId(nextCategory);
      setMatchingFeatures([]);
      setMatchingNearestFeatureId(null);
      setMatchingNearestFeatureName(null);
      setMatchingNearestFeaturePoint(null);
      setMatchingDistanceMeters(null);
      setMatchingFeatureCount(null);
      setMatchingInPlayAreaFeatureCount(null);
      setMatchingNearestOutsidePlayArea(false);
      setMatchingNullAnswer(false);
      setMatchingAnswer(null);
      setMatchingError(null);
    }, []),
  });

  const matchingBoundaryPreview = useMemo(() => {
    if (
      matchingNullAnswer ||
      !matchingNearestFeatureId ||
      matchingFeatures.length === 0
    ) {
      return null;
    }

    return buildSameNearestRegion(
      matchingFeatures,
      matchingNearestFeatureId,
      gameArea,
    );
  }, [
    gameArea,
    matchingFeatures,
    matchingNearestFeatureId,
    matchingNullAnswer,
  ]);

  const matchingEliminationPreview = useMemo(() => {
    if (
      matchingNullAnswer ||
      !matchingNearestFeatureId ||
      matchingFeatures.length === 0 ||
      matchingAnswer === null
    ) {
      return null;
    }

    return buildMatchingEliminationRegion(
      matchingFeatures,
      matchingNearestFeatureId,
      gameArea,
      matchingAnswer,
    );
  }, [
    gameArea,
    matchingAnswer,
    matchingFeatures,
    matchingNearestFeatureId,
    matchingNullAnswer,
  ]);

  const { beginRequest, cancelRequests, isLatestRequest } = useLatestRequest();

  const resolveForAnchor = useCallback(
    async (seekerPoint: LatLngTuple, categoryId: MatchingCategoryId) => {
      if (
        !isMatchingCategoryEnabled(categoryId) ||
        !isMatchingCategoryAvailable(categoryId)
      ) {
        setMatchingError("This matching category is not available yet.");
        return;
      }

      const requestId = beginRequest();
      setMatchingLoading(true);
      setMatchingError(null);

      try {
        const features = await fetchMatchingFeaturesInArea(
          gameArea,
          categoryId,
          matchingFetchOptions,
        );

        if (!isLatestRequest(requestId)) {
          return;
        }

        setMatchingFeatures(features);
        setMatchingFeatureCount(features.length);
        setMatchingInPlayAreaFeatureCount(countMatchingFeaturesInPlayArea(features));

        if (features.length === 0) {
          setMatchingNearestFeatureId(null);
          setMatchingNearestFeatureName(null);
          setMatchingNearestFeaturePoint(null);
          setMatchingDistanceMeters(null);
          setMatchingNearestOutsidePlayArea(false);
          setMatchingNullAnswer(true);
          setMatchingAnswer(null);
          return;
        }

        const category = getMatchingCategory(categoryId);
        const usesContainment =
          category.resolver === "reverseGeocodeAdmin" ||
          category.resolver === "landmass";

        const nearest = pickMatchingFeatureForAnchor(
          seekerPoint,
          features,
          categoryId,
        );

        if (!nearest) {
          setMatchingNearestFeatureId(null);
          setMatchingNearestFeatureName(null);
          setMatchingNearestFeaturePoint(null);
          setMatchingDistanceMeters(null);
          setMatchingNearestOutsidePlayArea(false);
          setMatchingNullAnswer(features.length === 0);
          setMatchingAnswer(null);
          setMatchingError(
            matchingResolveFailureMessage(categoryId, features.length),
          );
          return;
        }

        setMatchingNearestFeatureId(nearest.id);
        setMatchingNearestFeatureName(nearest.name);
        setMatchingNearestFeaturePoint(nearest.point);
        setMatchingDistanceMeters(
          usesContainment ? null : nearest.distanceMeters,
        );
        setMatchingNearestOutsidePlayArea(nearest.inPlayArea === false);
        setMatchingNullAnswer(false);
        setMatchingAnswer(null);
      } catch (error) {
        if (!isLatestRequest(requestId)) {
          return;
        }

        setMatchingError(
          overpassErrorMessage(error, "Couldn't resolve nearest feature."),
        );
      } finally {
        if (isLatestRequest(requestId)) {
          setMatchingLoading(false);
        }
      }
    },
    [beginRequest, gameArea, isLatestRequest, matchingFetchOptions],
  );

  const debouncedSeekerPoint = useDebouncedValue(matchingSeekerPoint, 400);

  useEffect(() => {
    if (
      !active ||
      !debouncedSeekerPoint ||
      !matchingCategoryId ||
      !matchingCategoryChosen
    ) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void resolveForAnchor(debouncedSeekerPoint, matchingCategoryId);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [
    active,
    matchingCategoryChosen,
    matchingCategoryId,
    debouncedSeekerPoint,
    resolveForAnchor,
  ]);

  const setMatchingSeekerAnchor = (point: LatLngTuple) => {
    setMatchingSeekerPoint(point);
    setMatchingFeatures([]);
    setMatchingNearestFeatureId(null);
    setMatchingNearestFeatureName(null);
    setMatchingNearestFeaturePoint(null);
    setMatchingDistanceMeters(null);
    setMatchingFeatureCount(null);
    setMatchingInPlayAreaFeatureCount(null);
    setMatchingNearestOutsidePlayArea(false);
    setMatchingNullAnswer(false);
    setMatchingAnswer(null);
    setMatchingError(null);
    if (matchingCategoryChosen && matchingCategoryId) {
      setMatchingLoading(true);
    }
  };

  const resetDraft = useCallback(() => {
    cancelRequests();
    setMatchingLoading(false);
    setMatchingSeekerPoint(null);
    setMatchingCategoryId(null);
    setMatchingCategoryChosen(false);
    setMatchingFeatures([]);
    setMatchingNearestFeatureId(null);
    setMatchingNearestFeatureName(null);
    setMatchingNearestFeaturePoint(null);
    setMatchingDistanceMeters(null);
    setMatchingFeatureCount(null);
    setMatchingInPlayAreaFeatureCount(null);
    setMatchingNearestOutsidePlayArea(false);
    setMatchingNullAnswer(false);
    setMatchingAnswer(null);
    setMatchingLoading(false);
    setMatchingError(null);
  }, [cancelRequests]);

  const handleMapClick = useCallback(
    (point: LatLngTuple) => {
      if (!active) {
        return false;
      }

      if (wizardStepRef.current !== "anchor") {
        return false;
      }

      setMatchingSeekerAnchor(point);
      return true;
    },
    [active],
  );

  const handleGps = async () => {
    setMatchingError(null);

    try {
      const reading = await refreshGps();
      const point: LatLngTuple = [reading.lat, reading.lng];
      if (!ensurePointInGameArea(point)) {
        setMatchingError("That point is outside the play area.");
        return;
      }

      setMatchingSeekerAnchor(point);
    } catch (error) {
      setMatchingError(
        error instanceof Error ? error.message : "GPS location unavailable.",
      );
    }
  };

  const commit = async () => {
    if (!canSubmitQuestion) {
      setMatchingError("Finish the open question before starting another.");
      return;
    }

    if (!matchingSeekerPoint || !matchingCategoryId) {
      return;
    }

    if (!matchingNullAnswer && !matchingNearestFeatureId) {
      return;
    }

    if (previewBeforeSend) {
      setPreviewOpen(true);
      return;
    }

    await performCommit();
  };

  const performCommit = async () => {
    if (!matchingSeekerPoint || !matchingCategoryId) {
      return;
    }

    const question = matchingQuestionFor(matchingCategoryId);

    if (awaitHiderAnswer && submitPendingQuestion && sessionId && senderUid) {
      const geometry: Feature<Point> = {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Point",
          coordinates: [matchingSeekerPoint[1], matchingSeekerPoint[0]],
        },
      };

      try {
        await submitPendingQuestion({
          promptText: question.prompt,
          replyOptions: [
            ...yesNoAnswerOptions.map((option) => ({
              id: option.value,
              label: option.label,
            })),
            ...(matchingNullAnswer
              ? [{ id: "null", label: "Null (not in play area)" }]
              : []),
          ],
          placement: {
            geometryJson: JSON.stringify(geometry),
            metadata: {
              matchingCategory: matchingCategoryId,
              matchingAnchor: {
                lat: matchingSeekerPoint[0],
                lng: matchingSeekerPoint[1],
              },
              matchingNearestFeatureId: matchingNearestFeatureId ?? undefined,
              matchingNearestFeatureName: matchingNearestFeatureName ?? undefined,
              matchingNearestFeaturePoint: matchingNearestFeaturePoint
                ? {
                    lat: matchingNearestFeaturePoint[0],
                    lng: matchingNearestFeaturePoint[1],
                  }
                : undefined,
              matchingDistanceMeters: matchingDistanceMeters ?? undefined,
              matchingFeatureCount: matchingFeatureCount ?? undefined,
              matchingNullAnswer,
              matchingFeaturesJson: serializeMatchingFeatures(matchingFeatures),
            },
          },
          cardDraw,
          cardKeep,
        });
      } catch (error) {
        setMatchingError(
          error instanceof Error
            ? error.message
            : "Couldn't send this match question.",
        );
        return;
      }

      resetDraft();
      finishPlacement();
      return;
    }

    if (matchingAnswer === null) {
      return;
    }

    const boundaryRegion = matchingNullAnswer
      ? null
      : buildSameNearestRegion(
          matchingFeatures,
          matchingNearestFeatureId!,
          gameArea,
        );
    const eliminationRegion = matchingNullAnswer
      ? null
      : buildMatchingEliminationRegion(
          matchingFeatures,
          matchingNearestFeatureId!,
          gameArea,
          matchingAnswer,
        );

    if (!matchingNullAnswer && (!boundaryRegion || !eliminationRegion)) {
      setMatchingError("Couldn't build matching elimination regions.");
      return;
    }

    const geometry: Feature<Point | GeoPolygon | MultiPolygon> =
      eliminationRegion ?? {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Point",
          coordinates: [matchingSeekerPoint[1], matchingSeekerPoint[0]],
        },
      };

    try {
      await createAnnotation({
        type: "matching",
        geometry,
        metadata: {
          createdAt: new Date().toISOString(),
          matchingCategory: matchingCategoryId,
          matchingAnswer,
          matchingAnchor: {
            lat: matchingSeekerPoint[0],
            lng: matchingSeekerPoint[1],
          },
          matchingNearestFeatureId: matchingNearestFeatureId ?? undefined,
          matchingNearestFeatureName: matchingNearestFeatureName ?? undefined,
          matchingNearestFeaturePoint: matchingNearestFeaturePoint
            ? {
                lat: matchingNearestFeaturePoint[0],
                lng: matchingNearestFeaturePoint[1],
              }
            : undefined,
          matchingDistanceMeters: matchingDistanceMeters ?? undefined,
          matchingFeatureCount: matchingFeatureCount ?? undefined,
          matchingNullAnswer,
          matchingBoundaryJson: boundaryRegion
            ? JSON.stringify(boundaryRegion)
            : undefined,
          matchingFeaturesJson: serializeMatchingFeatures(matchingFeatures),
          color: MAP_ANNOTATION_COLORS.elimination,
        },
      });
    } catch (error) {
      setMatchingError(
        error instanceof Error
          ? error.message
          : "Couldn't save this match question.",
      );
      return;
    }

    resetDraft();
    setPreviewOpen(false);
    finishPlacement();
  };

  const placementCrosshair = active && matchingSeekerPoint === null;

  const previewQuestion =
    matchingCategoryId !== null
      ? matchingQuestionFor(matchingCategoryId, customCategories)
      : null;

  const panel = (
    <>
    <MatchingPanel
      distanceUnit={distanceUnit}
      categoryId={matchingCategoryId}
      categoryChosen={matchingCategoryChosen}
      usedCategoryIds={usedMatchingCategories}
      catalogCategories={matchingCatalog}
      anchorLat={matchingSeekerPoint?.[0] ?? null}
      anchorLng={matchingSeekerPoint?.[1] ?? null}
      usesContainmentMatching={matchingUsesContainment}
      hasSeekerPoint={matchingSeekerPoint !== null}
      nearestFeatureName={matchingNearestFeatureName}
      distanceMeters={matchingDistanceMeters}
      featureCount={matchingFeatureCount}
      inPlayAreaFeatureCount={matchingInPlayAreaFeatureCount}
      nearestOutsidePlayArea={matchingNearestOutsidePlayArea}
      nullAnswer={matchingNullAnswer}
      loading={matchingLoading}
      gpsLoading={gpsLoading}
      answer={matchingAnswer}
      error={matchingError ?? gpsError ?? mapError}
      onCategoryChange={(categoryId) => {
        if (
          !isMatchingCategoryEnabled(categoryId) ||
          !isMatchingCategoryAvailable(categoryId)
        ) {
          return;
        }

        setMatchingCategoryChosen(true);
        setMatchingCategoryId(categoryId);
        setMatchingFeatures([]);
        setMatchingNearestFeatureId(null);
        setMatchingNearestFeatureName(null);
        setMatchingNearestFeaturePoint(null);
        setMatchingDistanceMeters(null);
        setMatchingFeatureCount(null);
        setMatchingInPlayAreaFeatureCount(null);
        setMatchingNearestOutsidePlayArea(false);
        setMatchingNullAnswer(false);
        setMatchingAnswer(null);
        setMatchingError(null);
      }}
      onUseGps={() => void handleGps()}
      onAnswerChange={setMatchingAnswer}
      onCommit={() => void runLocked(commit)}
      awaitHiderAnswer={awaitHiderAnswer}
      costLabel={costLabel}
      isSubmitting={isSubmitting}
      onRetry={
        matchingSeekerPoint && matchingCategoryId
          ? () =>
              void resolveForAnchor(matchingSeekerPoint, matchingCategoryId)
          : undefined
      }
      wizardStepRef={wizardStepRef}
    />
    <QuestionPreviewSheet
      open={previewOpen}
      prompt={previewQuestion?.prompt ?? ""}
      ruleSummary={previewQuestion?.ruleSummary}
      anchorLat={matchingSeekerPoint?.[0] ?? null}
      anchorLng={matchingSeekerPoint?.[1] ?? null}
      costLabel={costLabel}
      onConfirm={() => void runLocked(performCommit)}
      onCancel={() => setPreviewOpen(false)}
      isSubmitting={isSubmitting}
    />
    </>
  );

  return {
    draft: {
      matchingSeekerPoint,
      matchingNearestFeaturePoint,
      matchingBoundaryPreview,
      matchingEliminationPreview,
      seekerResolving: matchingLoading && matchingSeekerPoint !== null,
    },
    placementCrosshair,
    handleMapClick,
    resetDraft,
    commit,
    panel,
  };
}
