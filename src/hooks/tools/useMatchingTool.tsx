import { useCallback, useEffect, useMemo, useState } from "react";
import { useLatestRequest } from "../useLatestRequest";
import { useDebouncedValue } from "../useDebouncedValue";
import type {
  Feature,
  MultiPolygon,
  Point,
  Polygon as GeoPolygon,
} from "geojson";
import { MatchingPanel } from "../../components/tools/MatchingPanel";
import { overpassErrorMessage } from "../../services/overpassClient";
import type { GameArea } from "../../domain/annotations";
import { isActive, type AnnotationRecord } from "../../domain/annotations";
import type { LatLngTuple } from "../../domain/geometry";
import {
  buildMatchingEliminationRegion,
  buildSameNearestRegion,
} from "../../domain/matchingGeometry";
import {
  defaultMatchingCategoryId,
  firstAvailableMatchingCategoryId,
  getMatchingCategory,
  isMatchingCategoryAvailable,
  isMatchingCategoryEnabled,
  usedMatchingCategoryIds,
  type MatchingAnswer,
  type MatchingCategoryId,
} from "../../domain/matchingQuestions";
import type { DistanceUnit } from "../../domain/distance";
import {
  fetchMatchingFeaturesInArea,
  countMatchingFeaturesInPlayArea,
  matchingResolveFailureMessage,
  pickMatchingFeatureForAnchor,
  serializeMatchingFeatures,
  type MatchingFeature,
} from "../../services/matchingFeatures";
import { useToolSessionOptions } from "./useToolSessionOptions";
import { MAP_ANNOTATION_COLORS } from "../../domain/mapAnnotationColors";

interface UseMatchingToolParams {
  active: boolean;
  annotations: AnnotationRecord[];
  gameArea: GameArea;
  createAnnotation: (
    annotation: Omit<AnnotationRecord, "id" | "sessionId" | "status">,
  ) => Promise<AnnotationRecord>;
  distanceUnit: DistanceUnit;
  finishPlacement: () => void;
  gpsLoading: boolean;
  gpsError?: string | null;
  mapError: string | null;
  refreshGps: () => Promise<{ lat: number; lng: number }>;
  ensurePointInGameArea: (point: LatLngTuple) => boolean;
}

export function useMatchingTool({
  active,
  annotations,
  gameArea,
  createAnnotation,
  distanceUnit,
  finishPlacement,
  gpsLoading,
  gpsError,
  mapError,
  refreshGps,
  ensurePointInGameArea,
}: UseMatchingToolParams) {
  const usedMatchingCategories = useMemo(
    () => usedMatchingCategoryIds(annotations.filter(isActive)),
    [annotations],
  );
  const [matchingSeekerPoint, setMatchingSeekerPoint] =
    useState<LatLngTuple | null>(null);
  const [matchingCategoryId, setMatchingCategoryId] =
    useState<MatchingCategoryId>(defaultMatchingCategoryId());
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

  const matchingCategory = getMatchingCategory(matchingCategoryId);
  const matchingUsesContainment =
    matchingCategory.resolver === "reverseGeocodeAdmin" ||
    matchingCategory.resolver === "landmass";

  useToolSessionOptions({
    active,
    usedOptions: usedMatchingCategories,
    currentOption: matchingCategoryId,
    isAvailable: (usedOptions, currentOption) =>
      isMatchingCategoryAvailable(currentOption, usedOptions),
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
        !isMatchingCategoryAvailable(categoryId, usedMatchingCategories)
      ) {
        setMatchingError("This matching category is not available yet.");
        return;
      }

      const requestId = beginRequest();
      setMatchingLoading(true);
      setMatchingError(null);

      try {
        const features = await fetchMatchingFeaturesInArea(gameArea, categoryId);

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
          overpassErrorMessage(error, "Unable to resolve nearest feature."),
        );
      } finally {
        if (isLatestRequest(requestId)) {
          setMatchingLoading(false);
        }
      }
    },
    [beginRequest, gameArea, isLatestRequest, usedMatchingCategories],
  );

  const debouncedSeekerPoint = useDebouncedValue(matchingSeekerPoint, 400);

  useEffect(() => {
    if (!active || !debouncedSeekerPoint) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void resolveForAnchor(debouncedSeekerPoint, matchingCategoryId);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [active, matchingCategoryId, debouncedSeekerPoint, resolveForAnchor]);

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
    setMatchingLoading(true);
  };

  const resetDraft = useCallback(() => {
    cancelRequests();
    setMatchingLoading(false);
    setMatchingSeekerPoint(null);
    setMatchingCategoryId(defaultMatchingCategoryId(usedMatchingCategories));
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
  }, [cancelRequests, usedMatchingCategories]);

  const handleMapClick = useCallback(
    (point: LatLngTuple) => {
      if (!active) {
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
        error instanceof Error ? error.message : "Unable to read GPS location.",
      );
    }
  };

  const commit = async () => {
    if (!matchingSeekerPoint || matchingAnswer === null) {
      return;
    }

    if (!matchingNullAnswer && !matchingNearestFeatureId) {
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
      setMatchingError("Unable to build matching elimination regions.");
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
          : "Unable to save this match question.",
      );
      return;
    }

    resetDraft();
    finishPlacement();
  };

  const placementCrosshair = active && matchingSeekerPoint === null;

  const panel = (
    <MatchingPanel
      distanceUnit={distanceUnit}
      categoryId={matchingCategoryId}
      usedCategoryIds={usedMatchingCategories}
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
          !isMatchingCategoryAvailable(categoryId, usedMatchingCategories)
        ) {
          return;
        }

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
      onCommit={() => void commit()}
    />
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
