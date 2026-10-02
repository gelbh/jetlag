import area from "@turf/area";
import type { Feature, Polygon as GeoPolygon, MultiPolygon } from "geojson";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  buildMatchingEliminationRegion,
  buildSameNearestRegion,
  matchingEliminationFromSameNearestRegion,
} from "@/domain/geometry/measuring/matchingGeometry";
import {
  buildCoarsePolygonFeature,
  type PolygonLodPhase,
} from "@/domain/geometry/progressive/polygonLod";
import type { AnnotationRecord, GameArea } from "@/domain/map/annotations";
import {
  getMatchingCategory,
  type MatchingAnswer,
  type MatchingCategoryId,
  matchingCategoryUseCount,
  matchingCategoryUseCountFromPending,
  questionCostBreakdown,
} from "@/domain/questions";
import type { PendingQuestionRecord } from "@/domain/session/activity/sessionChat";
import {
  availableMatchingCategories,
  isPreviewQuestionBeforeSendEnabled,
} from "@/domain/session/catalog/sessionCatalogAvailability";
import {
  resolveMatchingCategory,
  sessionCustomContentFromRules,
} from "@/domain/session/catalog/sessionCustomCatalog";
import type { SessionRulesInput } from "@/domain/session/rules";
import { paintPolygonLod } from "@/hooks/tools/framework/paintPolygonLod";
import type { MatchingFeature, MatchingFetchOptions } from "@/services/geo/matching";
import { isAdminDivisionCategoryAvailable } from "@/services/geo/overpass/adminDivisionAvailability";
import { inferTransitMetroId } from "@/services/transit/transitCatalog";
import { usePreloadStore } from "@/state/preloadStore";

/** Temporary Voronoi/elim prefix — LOD step, not a catalog cap. */
export const MATCHING_CATALOG_COARSE_PREFIX = 16;

const yesElimWeakCache = new WeakMap<
  Feature<GeoPolygon | MultiPolygon>,
  Feature<GeoPolygon | MultiPolygon>
>();

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

function yesElimFromBoundary(
  boundary: Feature<GeoPolygon | MultiPolygon>,
  gameArea: GameArea,
): Feature<GeoPolygon | MultiPolygon> {
  const cached = yesElimWeakCache.get(boundary);
  if (cached) {
    return cached;
  }
  const yes = matchingEliminationFromSameNearestRegion(boundary, gameArea, "yes");
  yesElimWeakCache.set(boundary, yes);
  return yes;
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
        matchingCategoryUseCountFromPending(pendingQuestions, matchingCategoryId),
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
    () => (matchingCategoryId === "transit_line" ? inferTransitMetroId(gameArea) : null),
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
      isAdminDivisionCategoryAvailable(category.id, adminDivisionCounts, regionPackId),
    );
  }, [adminDivisionCounts, regionPackId, sessionRules]);

  const previewBeforeSend = isPreviewQuestionBeforeSendEnabled(
    sessionRules ?? { gameSize: "medium" },
  );

  const [eligibleBoundaryPreview, setEligibleBoundaryPreview] = useState<{
    nearestFeatureId: string;
    region: Feature<GeoPolygon | MultiPolygon>;
  } | null>(null);
  const [lodEliminationPreview, setLodEliminationPreview] = useState<Feature<
    GeoPolygon | MultiPolygon
  > | null>(null);
  const [matchingLodPhase, setMatchingLodPhase] = useState<PolygonLodPhase>("complete");
  const elimGenerationRef = useRef(0);
  const elimLodCancelRef = useRef<(() => void) | null>(null);

  const boundaryEligible =
    !matchingNullAnswer && Boolean(matchingNearestFeatureId) && matchingFeatures.length > 0;
  const matchingBoundaryPreview =
    boundaryEligible &&
    matchingNearestFeatureId &&
    eligibleBoundaryPreview?.nearestFeatureId === matchingNearestFeatureId
      ? eligibleBoundaryPreview.region
      : null;
  const eliminationEligible = boundaryEligible && matchingAnswer !== null;

  useEffect(() => {
    if (!boundaryEligible || !matchingNearestFeatureId) {
      return;
    }
    const nearestFeatureId = matchingNearestFeatureId;
    let cancelled = false;
    void buildSameNearestRegion(matchingFeatures, nearestFeatureId, gameArea)
      .then((region) => {
        if (cancelled) {
          return;
        }
        if (!region) {
          setEligibleBoundaryPreview(null);
          return;
        }
        setEligibleBoundaryPreview({ nearestFeatureId, region });
      })
      .catch(() => {
        if (!cancelled) {
          setEligibleBoundaryPreview(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [boundaryEligible, gameArea, matchingFeatures, matchingNearestFeatureId]);

  // Warm the yes complement after boundary lands (keeps the yes tap off the critical path).
  useEffect(() => {
    if (!matchingBoundaryPreview) {
      return;
    }
    const boundary = matchingBoundaryPreview;
    const timer = window.setTimeout(() => {
      yesElimFromBoundary(boundary, gameArea);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [gameArea, matchingBoundaryPreview]);

  // Prefer deriving elim from the same-nearest boundary (yes/no are complements).
  const derivedEliminationPreview = useMemo(() => {
    if (!eliminationEligible || matchingAnswer === null || !matchingBoundaryPreview) {
      return null;
    }
    if (matchingAnswer === "no") {
      return matchingBoundaryPreview;
    }
    return yesElimFromBoundary(matchingBoundaryPreview, gameArea);
  }, [eliminationEligible, gameArea, matchingAnswer, matchingBoundaryPreview]);

  // LOD only while the boundary is still building.
  useEffect(() => {
    if (
      !eliminationEligible ||
      !matchingNearestFeatureId ||
      matchingAnswer === null ||
      matchingBoundaryPreview
    ) {
      elimLodCancelRef.current?.();
      elimLodCancelRef.current = null;
      if (matchingBoundaryPreview || !eliminationEligible) {
        queueMicrotask(() => {
          setLodEliminationPreview(null);
          setMatchingLodPhase("complete");
        });
      }
      return;
    }

    const generation = elimGenerationRef.current + 1;
    elimGenerationRef.current = generation;
    elimLodCancelRef.current?.();
    elimLodCancelRef.current = null;
    queueMicrotask(() => {
      if (generation !== elimGenerationRef.current) {
        return;
      }
      setMatchingLodPhase("coarse");
    });

    const prefixFeatures = matchingCoarseCatalogPrefix(matchingFeatures, matchingNearestFeatureId);

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
        const prefixIsFull = prefixFeatures.length === matchingFeatures.length;
        if (prefixRegion && prefixIsFull) {
          paintPolygonLod(
            prefixRegion,
            generation,
            elimGenerationRef,
            setLodEliminationPreview,
            setMatchingLodPhase,
            elimLodCancelRef,
          );
          return;
        }
        if (prefixRegion) {
          setLodEliminationPreview(buildCoarsePolygonFeature(prefixRegion));
          setMatchingLodPhase("coarse");
        } else {
          setLodEliminationPreview(null);
        }

        if (prefixIsFull) {
          if (!prefixRegion) {
            setMatchingLodPhase("complete");
          }
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
          setMatchingLodPhase("complete");
          return;
        }
        elimLodCancelRef.current?.();
        elimLodCancelRef.current = null;
        paintPolygonLod(
          fullRegion,
          generation,
          elimGenerationRef,
          setLodEliminationPreview,
          setMatchingLodPhase,
          elimLodCancelRef,
        );
      } catch {
        if (generation === elimGenerationRef.current) {
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
    matchingBoundaryPreview,
    matchingFeatures,
    matchingNearestFeatureId,
  ]);

  const matchingEliminationPreview = eliminationEligible
    ? (derivedEliminationPreview ?? lodEliminationPreview)
    : null;

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
    matchingBoundaryPreview: boundaryEligible ? matchingBoundaryPreview : null,
    matchingEliminationPreview,
    matchingLodPhase:
      eliminationEligible && !matchingBoundaryPreview ? matchingLodPhase : "complete",
  };
}
