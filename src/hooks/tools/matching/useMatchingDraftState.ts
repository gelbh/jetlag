import { useCallback, useState } from "react";
import type { LatLngTuple } from "../../../domain/geometry/gameArea/geometry";
import type {
  MatchingAnswer,
  MatchingCategoryId,
} from "../../../domain/questions";
import type { MatchingFeature } from "../../../services/geo/matchingFeatures";

export function useMatchingDraftState() {
  const [matchingSeekerPoint, setMatchingSeekerPoint] =
    useState<LatLngTuple | null>(null);
  const [matchingCategoryId, setMatchingCategoryId] =
    useState<MatchingCategoryId | null>(null);
  const [matchingCategoryChosen, setMatchingCategoryChosen] = useState(false);
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
  const [previewOpen, setPreviewOpen] = useState(false);

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
  }, [clearResolvedFields]);

  const selectCategory = useCallback(
    (categoryId: MatchingCategoryId) => {
      setMatchingCategoryChosen(true);
      setMatchingCategoryId(categoryId);
      clearResolvedFields();
    },
    [clearResolvedFields],
  );

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
    clearResolvedFields,
  };
}
