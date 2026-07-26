import { useMemo } from "react";
import type { GameArea } from "../../../domain/map/annotations";
import type { AnnotationRecord } from "../../../domain/map/annotations";
import {
  buildMatchingEliminationRegion,
  buildSameNearestRegion,
} from "../../../domain/geometry/matchingGeometry";
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
} from "../../../domain/session/sessionCustomCatalog";
import {
  availableMatchingCategories,
  isPreviewQuestionBeforeSendEnabled,
} from "../../../domain/session/sessionCatalogAvailability";
import type { PendingQuestionRecord } from "../../../domain/session/sessionChat";
import type { SessionRulesInput } from "../../../domain/session/sessionRules";
import { isAdminDivisionCategoryAvailable } from "../../../services/geo/adminDivisionAvailability";
import type {
  MatchingFeature,
  MatchingFetchOptions,
} from "../../../services/geo/matchingFeatures";
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
    matchingBoundaryPreview,
    matchingEliminationPreview,
  };
}
