import { useEffect, useMemo, useState } from "react";
import type { Feature, MultiPolygon, Polygon as GeoPolygon } from "geojson";
import type { GameArea } from "../../../domain/map/annotations";
import type { AnnotationRecord } from "../../../domain/map/annotations";
import {
  buildMatchingEliminationRegion,
  buildSameNearestRegion,
} from "../../../domain/geometry/measuring/matchingGeometry";
import {
  getMatchingCategory,
  matchingCategoryUseCount,
  matchingCategoryUseCountFromPending,
  questionCostBreakdown,
  type MatchingAnswer,
  type MatchingCategoryId,
} from "../../../domain/questions";
import {
  resolveMatchingCategory,
  sessionCustomContentFromRules,
} from "../../../domain/session/catalog/sessionCustomCatalog";
import {
  availableMatchingCategories,
  isPreviewQuestionBeforeSendEnabled,
} from "../../../domain/session/catalog/sessionCatalogAvailability";
import type { PendingQuestionRecord } from "../../../domain/session/activity/sessionChat";
import type { SessionRulesInput } from "../../../domain/session/rules";
import { isAdminDivisionCategoryAvailable } from "../../../services/geo/overpass/adminDivisionAvailability";
import type {
  MatchingFeature,
  MatchingFetchOptions,
} from "../../../services/geo/matching";
import { inferTransitMetroId } from "../../../services/transit/transitCatalog";
import { usePreloadStore } from "../../../state/preloadStore";

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
      return;
    }
    let cancelled = false;
    void buildMatchingEliminationRegion(
      matchingFeatures,
      matchingNearestFeatureId,
      gameArea,
      matchingAnswer,
    )
      .then((region) => {
        if (!cancelled) {
          setMatchingEliminationPreview(region);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setMatchingEliminationPreview(null);
        }
      });

    return () => {
      cancelled = true;
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
  };
}
