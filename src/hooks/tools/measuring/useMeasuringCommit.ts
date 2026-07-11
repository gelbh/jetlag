import { useCallback } from "react";
import type { Feature, Point } from "geojson";
import { isActive, type AnnotationRecord } from "../../../domain/map/annotations";
import {
  buildMeasuringRegions,
} from "../../../domain/geometry/measuringRegions";
import {
  measuringFromKind,
  measuringFromKindUseCount,
  measuringFromKindUseCountFromPending,
  measuringQuestionFor,
} from "../../../domain/questions";
import { questionCostBreakdown } from "../../../domain/questions";
import type { PendingQuestionRecord } from "../../../domain/session/sessionChat";
import { adminBorderKindAvailability } from "../../../services/geo/adminDivisionAvailability";
import { closerFurtherAnswerOptions } from "../../../components/tools/shared/binaryAnswerOptions";
import type { SubmitPendingQuestionInput } from "../../sync/usePendingQuestionActions";
import { MAP_ANNOTATION_COLORS } from "../../../domain/map/mapAnnotationColors";
import type { MeasuringDraftState } from "./useMeasuringDraftState";
import type { MeasuringPreviews } from "./useMeasuringPreviews";

interface UseMeasuringCommitParams {
  annotations: AnnotationRecord[];
  pendingQuestions: readonly PendingQuestionRecord[];
  createAnnotation: (
    annotation: Omit<AnnotationRecord, "id" | "sessionId" | "status">,
  ) => Promise<AnnotationRecord>;
  awaitHiderAnswer: boolean;
  submitPendingQuestion?: (
    input: Omit<
      SubmitPendingQuestionInput,
      "sessionId" | "senderUid" | "senderRole" | "toolType"
    >,
  ) => Promise<void>;
  sessionId?: string;
  senderUid?: string | null;
  finishPlacement: () => void;
  canSubmitQuestion: boolean;
  draft: MeasuringDraftState;
  previews: MeasuringPreviews;
}

export function useMeasuringCommit({
  annotations,
  pendingQuestions,
  createAnnotation,
  awaitHiderAnswer,
  submitPendingQuestion,
  sessionId,
  senderUid,
  finishPlacement,
  canSubmitQuestion,
  draft,
  previews,
}: UseMeasuringCommitParams) {
  const {
    adminDivisionCounts,
    regionPackId,
    previewBeforeSend,
    measureFromKind,
    usesAllPlacesInArea,
    measuringSeekerPoint,
    measuringDistanceMeters,
    measuringSubject,
    measuringLocationCategory,
    measuringTargetPoint,
    measuringPlaces,
    measuringSeaLevelNearRegion,
    measuringAnchorElevationMeters,
    measuringTargetPlaceName,
    measuringAnswer,
    measuringSeaLevelNote,
    setMeasuringError,
    setPreviewOpen,
    resetDraft,
  } = draft;

  const {
    resolvedCoastSegments,
    measuringRegionInput,
    measuringNearRegion,
  } = previews;

  const performCommit = useCallback(async () => {
    if (!measuringSeekerPoint || measuringDistanceMeters === null) {
      return;
    }

    const committedKind = measuringFromKind(
      measuringSubject,
      measuringLocationCategory,
    );

    const locationCategory =
      measuringSubject === "location" ? measuringLocationCategory : undefined;
    const question = measuringQuestionFor(measuringSubject, locationCategory);

    if (awaitHiderAnswer && submitPendingQuestion && sessionId && senderUid) {
      const regionInputWithoutAnswer = {
        gameArea: measuringRegionInput.gameArea,
        measuringSubject,
        measuringLocationCategory,
        measuringDistanceMeters,
        measuringTargetPoint,
        measuringPlaces,
        measuringCoastSegments: resolvedCoastSegments,
        measuringSeaLevelNearRegion,
        usesAllPlacesInArea,
      };

      const geometry: Feature<Point> = {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Point",
          coordinates: [measuringSeekerPoint[1], measuringSeekerPoint[0]],
        },
      };

      const metadata: Record<string, unknown> = {
        measuringSubject,
        measuringLocationCategory:
          measuringSubject === "location" ? measuringLocationCategory : undefined,
        measuringDistanceMeters,
        measuringAnchor: {
          lat: measuringSeekerPoint[0],
          lng: measuringSeekerPoint[1],
        },
        measuringAnchorAltitudeMeters:
          measuringSubject === "sea_level"
            ? (measuringAnchorElevationMeters ?? undefined)
            : undefined,
        measuringCoastPoint:
          measuringSubject === "sea_level"
            ? {
                lat: measuringSeekerPoint[0],
                lng: measuringSeekerPoint[1],
              }
            : measuringTargetPoint
              ? {
                  lat: measuringTargetPoint[0],
                  lng: measuringTargetPoint[1],
                }
              : undefined,
        measuringTargetName:
          measuringSubject === "sea_level"
            ? "Sea level"
            : (measuringTargetPlaceName ?? undefined),
        measuringRegionInputJson: JSON.stringify(regionInputWithoutAnswer),
      };

      if (usesAllPlacesInArea) {
        metadata.measuringPlacesJson = JSON.stringify(
          measuringPlaces.map((place) => ({
            id: place.id,
            name: place.name,
            lat: place.point[0],
            lng: place.point[1],
          })),
        );
      }

      const { draw: cardDraw, keep: cardKeep } = questionCostBreakdown(
        "D3P1",
        Math.max(
          measuringFromKindUseCount(annotations.filter(isActive), committedKind),
          measuringFromKindUseCountFromPending(pendingQuestions, committedKind),
        ),
      );

      await submitPendingQuestion({
        promptText: question.prompt,
        replyOptions: closerFurtherAnswerOptions.map((option) => ({
          id: option.value,
          label: option.label,
        })),
        placement: {
          geometryJson: JSON.stringify(geometry),
          metadata,
        },
        cardDraw,
        cardKeep,
      });

      resetDraft(committedKind);
      finishPlacement();
      return;
    }

    if (measuringAnswer === null) {
      return;
    }

    const regions = buildMeasuringRegions({
      ...measuringRegionInput,
      precomputedNearRegion: measuringNearRegion,
    });
    if (!regions) {
      setMeasuringError("Couldn't build measure distance regions.");
      return;
    }

    const { near: nearRegion, elimination } = regions;

    const metadata: AnnotationRecord["metadata"] = {
      createdAt: new Date().toISOString(),
      measuringSubject,
      measuringLocationCategory:
        measuringSubject === "location" ? measuringLocationCategory : undefined,
      measuringAnswer,
      measuringDistanceMeters,
      measuringAnchor: {
        lat: measuringSeekerPoint[0],
        lng: measuringSeekerPoint[1],
      },
      measuringAnchorAltitudeMeters:
        measuringSubject === "sea_level"
          ? (measuringAnchorElevationMeters ?? undefined)
          : undefined,
      measuringCoastPoint:
        measuringSubject === "sea_level"
          ? {
              lat: measuringSeekerPoint[0],
              lng: measuringSeekerPoint[1],
            }
          : measuringTargetPoint
            ? {
                lat: measuringTargetPoint[0],
                lng: measuringTargetPoint[1],
              }
            : undefined,
      measuringTargetName:
        measuringSubject === "sea_level"
          ? "Sea level"
          : (measuringTargetPlaceName ?? undefined),
      measuringBoundaryJson: JSON.stringify(nearRegion),
      color: MAP_ANNOTATION_COLORS.elimination,
    };

    if (usesAllPlacesInArea) {
      metadata.measuringPlacesJson = JSON.stringify(
        measuringPlaces.map((place) => ({
          id: place.id,
          name: place.name,
          lat: place.point[0],
          lng: place.point[1],
        })),
      );
    }

    await createAnnotation({
      type: "measuring",
      geometry: elimination,
      metadata,
    });

    resetDraft(committedKind);
    setPreviewOpen(false);
    finishPlacement();
  }, [
    annotations,
    awaitHiderAnswer,
    createAnnotation,
    finishPlacement,
    measuringAnchorElevationMeters,
    measuringAnswer,
    measuringDistanceMeters,
    measuringLocationCategory,
    measuringNearRegion,
    measuringPlaces,
    measuringRegionInput,
    measuringSeekerPoint,
    measuringSubject,
    measuringSeaLevelNearRegion,
    measuringTargetPlaceName,
    measuringTargetPoint,
    pendingQuestions,
    resetDraft,
    resolvedCoastSegments,
    senderUid,
    sessionId,
    setMeasuringError,
    setPreviewOpen,
    submitPendingQuestion,
    usesAllPlacesInArea,
  ]);

  const commit = useCallback(async () => {
    if (!canSubmitQuestion) {
      setMeasuringError("Finish the open question before starting another.");
      return;
    }

    if (!measuringSeekerPoint || measuringDistanceMeters === null) {
      return;
    }

    if (
      !adminBorderKindAvailability(measureFromKind, adminDivisionCounts, regionPackId)
    ) {
      setMeasuringError("That measure category has already been added.");
      return;
    }

    if (
      measuringSubject !== "sea_level" &&
      !usesAllPlacesInArea &&
      !measuringTargetPoint
    ) {
      return;
    }

    if (usesAllPlacesInArea && measuringPlaces.length === 0) {
      return;
    }

    if (measuringSubject === "sea_level" && !measuringSeaLevelNearRegion) {
      setMeasuringError(
        measuringSeaLevelNote ??
          "Sea level region isn't ready yet. Wait for elevation sampling or tap Retry.",
      );
      return;
    }

    if (previewBeforeSend) {
      setPreviewOpen(true);
      return;
    }

    await performCommit();
  }, [
    adminDivisionCounts,
    canSubmitQuestion,
    measureFromKind,
    measuringDistanceMeters,
    measuringPlaces.length,
    measuringSeaLevelNearRegion,
    measuringSeaLevelNote,
    measuringSeekerPoint,
    measuringSubject,
    measuringTargetPoint,
    performCommit,
    previewBeforeSend,
    regionPackId,
    setMeasuringError,
    setPreviewOpen,
    usesAllPlacesInArea,
  ]);

  return { commit, performCommit };
}
