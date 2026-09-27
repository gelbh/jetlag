import type { RefObject } from "react";
import { MatchingPanel } from "@/components/tools/MatchingPanel";
import { QuestionPreviewSheet } from "@/components/tools/shared/controls/QuestionPreviewSheet";
import type { LatLngTuple } from "@/domain/geometry/gameArea/geometry";
import type { DistanceUnit } from "@/domain/map/distance";
import type {
  MatchingAnswer,
  MatchingCategoryDefinition,
  MatchingCategoryId,
  MatchingQuestionDefinition,
} from "@/domain/questions";

/** Flat matching tool panel fields bag for MatchingToolPanel (W4-D peel). */
export type MatchingToolPanelModel = {
  distanceUnit: DistanceUnit;
  categoryId: MatchingCategoryId | null;
  categoryChosen: boolean;
  usedCategoryIds: ReadonlySet<MatchingCategoryId>;
  unavailableCategoryIds?: ReadonlySet<MatchingCategoryId>;
  catalogNotice?: string | null;
  catalogCategories: MatchingCategoryDefinition[];
  matchingSeekerPoint: LatLngTuple | null;
  matchingUsesContainment: boolean;
  matchingNearestFeatureName: string | null;
  matchingDistanceMeters: number | null;
  matchingFeatureCount: number | null;
  matchingInPlayAreaFeatureCount: number | null;
  matchingNearestOutsidePlayArea: boolean;
  matchingNullAnswer: boolean;
  matchingLoading: boolean;
  nearestProvisional?: boolean;
  satelliteBasemap?: boolean;
  gpsLoading: boolean;
  matchingAnswer: MatchingAnswer | null;
  error: string | null;
  awaitHiderAnswer: boolean;
  costLabel: string;
  isSubmitting: boolean;
  previewOpen: boolean;
  previewQuestion: MatchingQuestionDefinition | null;
  wizardStepRef: RefObject<string | null>;
  onCategoryChange: (categoryId: MatchingCategoryId) => void;
  onUseGps: () => void;
  onAnswerChange: (answer: MatchingAnswer | null) => void;
  onCommit: () => void;
  onRetry?: () => void;
  onPreviewConfirm: () => void;
  onPreviewCancel: () => void;
};

export type MatchingToolPanelProps = {
  model: MatchingToolPanelModel;
};

export function MatchingToolPanel({ model }: MatchingToolPanelProps) {
  const {
    distanceUnit,
    categoryId,
    categoryChosen,
    usedCategoryIds,
    unavailableCategoryIds,
    catalogNotice,
    catalogCategories,
    matchingSeekerPoint,
    matchingUsesContainment,
    matchingNearestFeatureName,
    matchingDistanceMeters,
    matchingFeatureCount,
    matchingInPlayAreaFeatureCount,
    matchingNearestOutsidePlayArea,
    matchingNullAnswer,
    matchingLoading,
    nearestProvisional = false,
    satelliteBasemap = false,
    gpsLoading,
    matchingAnswer,
    error,
    awaitHiderAnswer,
    costLabel,
    isSubmitting,
    previewOpen,
    previewQuestion,
    wizardStepRef,
    onCategoryChange,
    onUseGps,
    onAnswerChange,
    onCommit,
    onRetry,
    onPreviewConfirm,
    onPreviewCancel,
  } = model;

  return (
    <>
      <MatchingPanel
        model={{
          distanceUnit,
          categoryId,
          categoryChosen,
          usedCategoryIds,
          unavailableCategoryIds,
          catalogNotice,
          catalogCategories,
          anchorLat: matchingSeekerPoint?.[0] ?? null,
          anchorLng: matchingSeekerPoint?.[1] ?? null,
          usesContainmentMatching: matchingUsesContainment,
          hasSeekerPoint: matchingSeekerPoint !== null,
          nearestFeatureName: matchingNearestFeatureName,
          distanceMeters: matchingDistanceMeters,
          featureCount: matchingFeatureCount,
          inPlayAreaFeatureCount: matchingInPlayAreaFeatureCount,
          nearestOutsidePlayArea: matchingNearestOutsidePlayArea,
          nullAnswer: matchingNullAnswer,
          loading: matchingLoading,
          nearestProvisional,
          satelliteBasemap,
          gpsLoading,
          answer: matchingAnswer,
          error,
          onCategoryChange,
          onUseGps,
          onAnswerChange,
          onCommit,
          awaitHiderAnswer,
          costLabel,
          isSubmitting,
          onRetry,
          wizardStepRef,
        }}
      />
      <QuestionPreviewSheet
        open={previewOpen}
        prompt={previewQuestion?.prompt ?? ""}
        ruleSummary={previewQuestion?.ruleSummary}
        anchorLat={matchingSeekerPoint?.[0] ?? null}
        anchorLng={matchingSeekerPoint?.[1] ?? null}
        costLabel={costLabel}
        onConfirm={onPreviewConfirm}
        onCancel={onPreviewCancel}
        isSubmitting={isSubmitting}
      />
    </>
  );
}
