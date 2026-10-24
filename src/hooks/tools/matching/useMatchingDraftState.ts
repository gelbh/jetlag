import { useCallback, useEffect, useMemo, useState } from "react";
import type { LatLngTuple } from "@/domain/geometry/gameArea/geometry";
import type { MatchingAnswer, MatchingCategoryId } from "@/domain/questions";
import { resolveCategoryPresence } from "@/domain/session/catalog/playAreaCategoryPresence";
import { availableMatchingCategories } from "@/domain/session/catalog/sessionCatalogAvailability";
import type { SessionRulesInput } from "@/domain/session/rules";
import type { MatchingFeature } from "@/services/geo/matching";
import { matchingEmptyPlayAreaMessage } from "@/services/geo/matching";
import { isAdminDivisionCategoryAvailable } from "@/services/geo/overpass/adminDivisionAvailability";
import { usePreloadStore } from "@/state/preloadStore";

export function useMatchingDraftState(sessionRules?: SessionRulesInput) {
  const [matchingSeekerPoint, setMatchingSeekerPoint] = useState<LatLngTuple | null>(null);
  const [matchingCategoryId, setMatchingCategoryId] = useState<MatchingCategoryId | null>(null);
  const [matchingCategoryChosen, setMatchingCategoryChosen] = useState(false);
  const [matchingFeatures, setMatchingFeatures] = useState<MatchingFeature[]>([]);
  const [matchingNearestFeatureId, setMatchingNearestFeatureId] = useState<string | null>(null);
  const [matchingNearestFeatureName, setMatchingNearestFeatureName] = useState<string | null>(null);
  const [matchingNearestFeaturePoint, setMatchingNearestFeaturePoint] =
    useState<LatLngTuple | null>(null);
  const [matchingDistanceMeters, setMatchingDistanceMeters] = useState<number | null>(null);
  const [matchingFeatureCount, setMatchingFeatureCount] = useState<number | null>(null);
  const [matchingInPlayAreaFeatureCount, setMatchingInPlayAreaFeatureCount] = useState<
    number | null
  >(null);
  const [matchingNearestOutsidePlayArea, setMatchingNearestOutsidePlayArea] = useState(false);
  const [matchingNullAnswer, setMatchingNullAnswer] = useState(false);
  const [matchingAnswer, setMatchingAnswer] = useState<MatchingAnswer | null>(null);
  const [matchingLoading, setMatchingLoading] = useState(false);
  const [matchingError, setMatchingError] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [unavailableMatchingCategories, setUnavailableMatchingCategories] = useState<
    Map<MatchingCategoryId, string>
  >(() => new Map());
  const [catalogNotice, setCatalogNotice] = useState<string | null>(null);

  const adminDivisionCounts = usePreloadStore((state) => state.adminDivisionCounts);
  const categoryPresenceCounts = usePreloadStore((state) => state.categoryPresenceCounts);
  const regionPackId = sessionRules?.regionPackId;

  const matchingCatalog = useMemo(() => {
    const categories = sessionRules
      ? availableMatchingCategories(sessionRules)
      : availableMatchingCategories({ gameSize: "medium" });
    return categories.filter((category) =>
      isAdminDivisionCategoryAvailable(category.id, adminDivisionCounts, regionPackId),
    );
  }, [adminDivisionCounts, regionPackId, sessionRules]);

  const seedUnavailableFromPresence = useCallback((): Map<MatchingCategoryId, string> => {
    const next = new Map<MatchingCategoryId, string>();
    if (!regionPackId) {
      return next;
    }

    const probePending = categoryPresenceCounts === null;
    for (const category of matchingCatalog) {
      const adminUnavailable = !isAdminDivisionCategoryAvailable(
        category.id,
        adminDivisionCounts,
        regionPackId,
      );
      const presence = resolveCategoryPresence({
        categoryId: category.id,
        regionPackId,
        adminUnavailable,
        probeCount: categoryPresenceCounts?.[category.id],
        probePending,
      });
      if (!presence.available) {
        next.set(category.id, matchingEmptyPlayAreaMessage(category.id));
      }
    }
    return next;
  }, [adminDivisionCounts, categoryPresenceCounts, matchingCatalog, regionPackId]);

  useEffect(() => {
    const seeded = seedUnavailableFromPresence();
    setUnavailableMatchingCategories((prev) => {
      if (seeded.size === 0) {
        return prev;
      }
      let changed = false;
      const next = new Map(prev);
      for (const [categoryId, notice] of seeded) {
        if (!next.has(categoryId)) {
          next.set(categoryId, notice);
          changed = true;
        }
      }
      return changed ? next : prev;
    });
    if (seeded.size > 0) {
      const firstNotice = seeded.values().next().value;
      setCatalogNotice(firstNotice ?? "Some categories aren't available in this play area.");
    }
  }, [seedUnavailableFromPresence]);

  const clearResolvedFields = useCallback(() => {
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
  }, []);

  const setMatchingSeekerAnchor = useCallback(
    (point: LatLngTuple) => {
      setMatchingSeekerPoint(point);
      clearResolvedFields();
      if (matchingCategoryChosen && matchingCategoryId) {
        setMatchingLoading(true);
      }
    },
    [clearResolvedFields, matchingCategoryChosen, matchingCategoryId],
  );

  const resetDraft = useCallback(() => {
    setMatchingLoading(false);
    setMatchingSeekerPoint(null);
    setMatchingCategoryId(null);
    setMatchingCategoryChosen(false);
    clearResolvedFields();
    setPreviewOpen(false);
    const seeded = seedUnavailableFromPresence();
    setUnavailableMatchingCategories(seeded);
    setCatalogNotice(
      seeded.size > 0
        ? (seeded.values().next().value ?? "Some categories aren't available in this play area.")
        : null,
    );
  }, [clearResolvedFields, seedUnavailableFromPresence]);

  const selectCategory = useCallback(
    (categoryId: MatchingCategoryId) => {
      setMatchingCategoryChosen(true);
      setMatchingCategoryId(categoryId);
      setCatalogNotice(null);
      clearResolvedFields();
    },
    [clearResolvedFields],
  );

  const reopenCategoryPicker = useCallback(() => {
    setMatchingLoading(false);
    setMatchingSeekerPoint(null);
    setMatchingCategoryId(null);
    setMatchingCategoryChosen(false);
    clearResolvedFields();
    setPreviewOpen(false);
  }, [clearResolvedFields]);

  return {
    matchingSeekerPoint,
    matchingCategoryId,
    matchingCategoryChosen,
    matchingFeatures,
    matchingNearestFeatureId,
    matchingNearestFeatureName,
    matchingNearestFeaturePoint,
    matchingDistanceMeters,
    matchingFeatureCount,
    matchingInPlayAreaFeatureCount,
    matchingNearestOutsidePlayArea,
    matchingNullAnswer,
    matchingAnswer,
    matchingLoading,
    matchingError,
    previewOpen,
    unavailableMatchingCategories,
    catalogNotice,
    setUnavailableMatchingCategories,
    setCatalogNotice,
    setMatchingCategoryId,
    setMatchingFeatures,
    setMatchingNearestFeatureId,
    setMatchingNearestFeatureName,
    setMatchingNearestFeaturePoint,
    setMatchingDistanceMeters,
    setMatchingFeatureCount,
    setMatchingInPlayAreaFeatureCount,
    setMatchingNearestOutsidePlayArea,
    setMatchingNullAnswer,
    setMatchingAnswer,
    setMatchingLoading,
    setMatchingError,
    setPreviewOpen,
    setMatchingSeekerAnchor,
    resetDraft,
    selectCategory,
    reopenCategoryPicker,
    clearResolvedFields,
  };
}
