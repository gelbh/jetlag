import type { RefObject } from "react";
import { MatchingPanel } from "../../../components/tools/MatchingPanel";
import { QuestionPreviewSheet } from "../../../components/tools/shared/controls/QuestionPreviewSheet";
import type { LatLngTuple } from "../../../domain/geometry/gameArea/geometry";
import type { DistanceUnit } from "../../../domain/map/distance";
import type {
  MatchingAnswer,
  MatchingCategoryDefinition,
  MatchingCategoryId,
  MatchingQuestionDefinition,
} from "../../../domain/questions";

interface MatchingToolPanelProps {
  distanceUnit: DistanceUnit;
  categoryId: MatchingCategoryId | null;
  categoryChosen: boolean;
  usedCategoryIds: ReadonlySet<MatchingCategoryId>;
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
  gpsLoading: boolean;
  matchingAnswer: MatchingAnswer | null;
  error: string | null;
  awaitHiderAnswer: boolean;
  costLabel: string;
  isSubmitting: boolean;
  previewOpen: boolean;
  previewQuestion: MatchingQuestionDefinition | null;
  wizardStepRef: RefObject<string>;
  onCategoryChange: (categoryId: MatchingCategoryId) => void;
  onUseGps: () => void;
  onAnswerChange: (answer: MatchingAnswer | null) => void;
  onCommit: () => void;
  onRetry?: () => void;
  onPreviewConfirm: () => void;
  onPreviewCancel: () => void;
  endGameActive?: boolean;
}

export function MatchingToolPanel({
  distanceUnit,
  categoryId,
  categoryChosen,
  usedCategoryIds,
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
  endGameActive = false,
}: MatchingToolPanelProps) {
  return (
    <>
      <MatchingPanel
        distanceUnit={distanceUnit}
        categoryId={categoryId}
        categoryChosen={categoryChosen}
        usedCategoryIds={usedCategoryIds}
        catalogCategories={catalogCategories}
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
        error={error}
        onCategoryChange={onCategoryChange}
        onUseGps={onUseGps}
        onAnswerChange={onAnswerChange}
        onCommit={onCommit}
        awaitHiderAnswer={awaitHiderAnswer}
        costLabel={costLabel}
        isSubmitting={isSubmitting}
        onRetry={onRetry}
        wizardStepRef={wizardStepRef}
        endGameActive={endGameActive}
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
