import { useEffect, useMemo, useRef, useState } from "react";
import area from "@turf/area";
import type { Feature, MultiPolygon, Polygon as GeoPolygon } from "geojson";
import type { GameArea } from "@/domain/map/annotations";
import type { AnnotationRecord } from "@/domain/map/annotations";
import {
  buildMatchingEliminationRegion,
  buildSameNearestRegion,
} from "@/domain/geometry/measuring/matchingGeometry";
import {
  buildCoarsePolygonFeature,
  refinePolygonFeatureStep,
  type PolygonLodPhase,
} from "@/domain/geometry/progressive/polygonLod";
import { previewGeometryFingerprint } from "@/domain/geometry/measuring/previewGeometryFingerprint";
import {
  getMatchingCategory,
  matchingCategoryUseCount,
  matchingCategoryUseCountFromPending,
  questionCostBreakdown,
  type MatchingAnswer,
  type MatchingCategoryId,
} from "@/domain/questions";
import {
  resolveMatchingCategory,
  sessionCustomContentFromRules,
} from "@/domain/session/catalog/sessionCustomCatalog";
import {
  availableMatchingCategories,
  isPreviewQuestionBeforeSendEnabled,
} from "@/domain/session/catalog/sessionCatalogAvailability";
import type { PendingQuestionRecord } from "@/domain/session/activity/sessionChat";
import type { SessionRulesInput } from "@/domain/session/rules";
import { isAdminDivisionCategoryAvailable } from "@/services/geo/overpass/adminDivisionAvailability";
import type {
  MatchingFeature,
  MatchingFetchOptions,
} from "@/services/geo/matching";
import { inferTransitMetroId } from "@/services/transit/transitCatalog";
import { usePreloadStore } from "@/state/preloadStore";

/** Temporary Voronoi/elim prefix — LOD step, not a catalog cap. */
export const MATCHING_CATALOG_COARSE_PREFIX = 16;

function matchingFeatureArea(feature: MatchingFeature): number {
  if (!feature.boundary) {
    return 0;
  }
  try {
    return area({
      type: "Feature",
      properties: {},
      geometry: feature.boundary,
    });
  } catch {
    return 0;
  }
}

/** Largest-first prefix; always includes the answered site. */
export function matchingCoarseCatalogPrefix(
  features: readonly MatchingFeature[],
  nearestFeatureId: string,
): MatchingFeature[] {
  if (features.length <= MATCHING_CATALOG_COARSE_PREFIX) {
    return [...features];
  }
  const nearest = features.find((item) => item.id === nearestFeatureId);
  const rest = features
    .filter((item) => item.id !== nearestFeatureId)
    .sort((a, b) => matchingFeatureArea(b) - matchingFeatureArea(a))
    .slice(0, MATCHING_CATALOG_COARSE_PREFIX - (nearest ? 1 : 0));
  return nearest ? [nearest, ...rest] : rest;
}

function scheduleIdle(callback: () => void): () => void {
  if (typeof requestIdleCallback === "function") {
    const id = requestIdleCallback(() => {
      callback();
    });
    return () => cancelIdleCallback(id);
  }
  const id = setTimeout(callback, 0);
  return () => clearTimeout(id);
}

function paintLodFeature(
  full: Feature<GeoPolygon | MultiPolygon>,
  generation: number,
  generationRef: { current: number },
  setFeature: (feature: Feature<GeoPolygon | MultiPolygon> | null) => void,
  setPhase: (phase: PolygonLodPhase) => void,
  cancelRef: { current: (() => void) | null },
): void {
  const coarse = buildCoarsePolygonFeature(full);
  setFeature(coarse);

  if (previewGeometryFingerprint(coarse) === previewGeometryFingerprint(full)) {
    cancelRef.current = null;
    setFeature(full);
    setPhase("complete");
    return;
  }

  setPhase("refining");
  let stepIndex = 0;
  let current = coarse;

  const runStep = () => {
    if (generation !== generationRef.current) {
      return;
    }
    const next = refinePolygonFeatureStep(full, current, stepIndex);
    current = next.feature;
    setFeature(current);
    stepIndex += 1;
    if (next.done) {
      cancelRef.current = null;
      setFeature(full);
      setPhase("complete");
      return;
    }
    cancelRef.current = scheduleIdle(runStep);
  };

  cancelRef.current = scheduleIdle(runStep);
}

export function useMatchingCatalog(input: {
  activeAnnotations: AnnotationRecord[];
  pendingQuestions: readonly PendingQuestionRecord[];
  matchingCategoryId: MatchingCategoryId | null;
  matchingFeatures: MatchingFeature[];
  matchingNearestFeatureId: string | null;
  matchingNullAnswer: boolean;
  matchingAnswer: MatchingAnswer | null;
  gameArea: GameArea;
  sessionRules?: SessionRulesInput;
}) {
  const {
    activeAnnotations,
    pendingQuestions,
    matchingCategoryId,
    matchingFeatures,
    matchingNearestFeatureId,
    matchingNullAnswer,
    matchingAnswer,
    gameArea,
    sessionRules,
  } = input;

  const matchingUseCount = matchingCategoryId
    ? Math.max(
        matchingCategoryUseCount(activeAnnotations, matchingCategoryId),
        matchingCategoryUseCountFromPending(
          pendingQuestions,
          matchingCategoryId,
        ),
      )
    : 0;
  const cost = questionCostBreakdown("D3P1", matchingUseCount);

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
      regionPackId: sessionRules?.regionPackId,
    };
  }, [sessionRules]);

  const matchingTransitMetroId = useMemo(
    () =>
      matchingCategoryId === "transit_line"
        ? inferTransitMetroId(gameArea)
        : null,
    [matchingCategoryId, gameArea],
  );

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

  const matchingCatalog = useMemo(() => {
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
  }, [adminDivisionCounts, regionPackId, sessionRules]);

  const previewBeforeSend = isPreviewQuestionBeforeSendEnabled(
    sessionRules ?? { gameSize: "medium" },
  );

  const [matchingBoundaryPreview, setMatchingBoundaryPreview] = useState<
    Feature<GeoPolygon | MultiPolygon> | null
  >(null);
  const [matchingEliminationPreview, setMatchingEliminationPreview] = useState<
    Feature<GeoPolygon | MultiPolygon> | null
  >(null);
  const [matchingLodPhase, setMatchingLodPhase] =
    useState<PolygonLodPhase>("complete");
  const elimGenerationRef = useRef(0);
  const elimLodCancelRef = useRef<(() => void) | null>(null);

  const boundaryEligible =
    !matchingNullAnswer &&
    Boolean(matchingNearestFeatureId) &&
    matchingFeatures.length > 0;
  const eliminationEligible =
    boundaryEligible && matchingAnswer !== null;

  useEffect(() => {
    if (!boundaryEligible || !matchingNearestFeatureId) {
      return;
    }
    let cancelled = false;
    void buildSameNearestRegion(
      matchingFeatures,
      matchingNearestFeatureId,
      gameArea,
    )
      .then((region) => {
        if (!cancelled) {
          setMatchingBoundaryPreview(region);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setMatchingBoundaryPreview(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    boundaryEligible,
    gameArea,
    matchingFeatures,
    matchingNearestFeatureId,
  ]);

  useEffect(() => {
    if (
      !eliminationEligible ||
      !matchingNearestFeatureId ||
      matchingAnswer === null
    ) {
      elimLodCancelRef.current?.();
      elimLodCancelRef.current = null;
      return;
    }

    const generation = elimGenerationRef.current + 1;
    elimGenerationRef.current = generation;
    elimLodCancelRef.current?.();
    elimLodCancelRef.current = null;
    setMatchingLodPhase("coarse");

    const prefixFeatures = matchingCoarseCatalogPrefix(
      matchingFeatures,
      matchingNearestFeatureId,
    );

    void (async () => {
      try {
        const prefixRegion = await buildMatchingEliminationRegion(
          prefixFeatures,
          matchingNearestFeatureId,
          gameArea,
          matchingAnswer,
        );
        if (generation !== elimGenerationRef.current) {
          return;
        }
        if (prefixRegion) {
          paintLodFeature(
            prefixRegion,
            generation,
            elimGenerationRef,
            setMatchingEliminationPreview,
            setMatchingLodPhase,
            elimLodCancelRef,
          );
        } else {
          setMatchingEliminationPreview(null);
          setMatchingLodPhase("complete");
        }

        if (prefixFeatures.length === matchingFeatures.length) {
          return;
        }

        const fullRegion = await buildMatchingEliminationRegion(
          matchingFeatures,
          matchingNearestFeatureId,
          gameArea,
          matchingAnswer,
        );
        if (generation !== elimGenerationRef.current) {
          return;
        }
        if (!fullRegion) {
          return;
        }
        elimLodCancelRef.current?.();
        elimLodCancelRef.current = null;
        paintLodFeature(
          fullRegion,
          generation,
          elimGenerationRef,
          setMatchingEliminationPreview,
          setMatchingLodPhase,
          elimLodCancelRef,
        );
      } catch {
        if (generation === elimGenerationRef.current) {
          setMatchingEliminationPreview(null);
          setMatchingLodPhase("complete");
        }
      }
    })();

    return () => {
      elimGenerationRef.current += 1;
      elimLodCancelRef.current?.();
      elimLodCancelRef.current = null;
    };
  }, [
    eliminationEligible,
    gameArea,
    matchingAnswer,
    matchingFeatures,
    matchingNearestFeatureId,
  ]);

  return {
    costLabel: cost.label,
    cardDraw: cost.draw,
    cardKeep: cost.keep,
    matchingFetchOptions,
    matchingTransitMetroId,
    customCategories,
    matchingUsesContainment,
    adminDivisionCounts,
    regionPackId,
    matchingCatalog,
    previewBeforeSend,
    matchingBoundaryPreview: boundaryEligible
      ? matchingBoundaryPreview
      : null,
    matchingEliminationPreview: eliminationEligible
      ? matchingEliminationPreview
      : null,
    matchingLodPhase: eliminationEligible ? matchingLodPhase : "complete",
    matchingCatalogComplete: true,
  };
}
