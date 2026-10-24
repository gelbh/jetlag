import { useCallback } from "react";
import { closerFurtherAnswerOptions } from "@/components/tools/shared/answers/binaryAnswerOptions";
import { persistSlimMeasuringGeometry } from "@/domain/geometry/measuring/measuringGeometryBudgets";
import { buildMeasuringRegions } from "@/domain/geometry/measuring/measuringRegions";
import { persistEliminationOrDeferPoint } from "@/domain/geometry/progressive/persistEliminationOrDeferPoint";
import { type AnnotationRecord, isActive } from "@/domain/map/annotations";
import { MAP_ANNOTATION_COLORS } from "@/domain/map/mapAnnotationColors";
import {
  measuringFromKind,
  measuringFromKindUseCount,
  measuringFromKindUseCountFromPending,
  measuringQuestionFor,
  questionCostBreakdown,
} from "@/domain/questions";
import { seekerAnchorPointFeature } from "@/domain/questions/deferredSeekerPoint";
import type { PendingQuestionRecord } from "@/domain/session/activity/sessionChat";
import type { SessionMode } from "@/domain/session/castleSiege/mode";
import type { CastleSiegeOracleReceipt } from "@/domain/session/castleSiege/oracleAskReceipt";
import type { CastleSiegePlayingTeam } from "@/domain/session/castleSiege/pregame";
import { resolveAskPath } from "@/domain/session/castleSiege/resolveAskPath";
import { adminBorderKindAvailability } from "@/services/geo/overpass/adminDivisionAvailability";
import type {
  AnswerCastleSiegeOracleAskFn,
  CastleSiegeOracleAskPayload,
} from "@/services/session/castleSiegeOracleAsk";
import { resolveAskAnswer } from "@/services/session/castleSiegeOracleAsk";
import { emitQuestionAnsweredActivity } from "@/services/session/emitSessionActivity";
import type { SubmitPendingQuestionInput } from "../../sync/usePendingQuestionActions";
import { buildStoredMeasuringRegionInput, measuringCommitReady } from "./helpers";
import { buildMeasuringPendingInput } from "./measuringPendingInput";
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
    input: Omit<SubmitPendingQuestionInput, "sessionId" | "senderUid" | "senderRole" | "toolType">,
  ) => Promise<void>;
  sessionId?: string;
  senderUid?: string | null;
  finishPlacement: () => void;
  canSubmitQuestion: boolean;
  draft: MeasuringDraftState;
  previews: MeasuringPreviews;
  sessionMode?: SessionMode | null;
  defenderTeamId?: CastleSiegePlayingTeam | null;
  callOracleAsk?: AnswerCastleSiegeOracleAskFn;
  oracleReceipt?: Extract<CastleSiegeOracleReceipt, { kind: "measuring" }> | null;
  onOracleReceipt?: (receipt: Extract<CastleSiegeOracleReceipt, { kind: "measuring" }>) => void;
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
  sessionMode = null,
  defenderTeamId = null,
  callOracleAsk,
  oracleReceipt = null,
  onOracleReceipt,
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
    measuringLoading,
    setMeasuringError,
    setPreviewOpen,
    resetDraft,
  } = draft;

  const { resolvedCoastSegments, measuringRegionInput } = previews;

  const commitReady = measuringCommitReady({
    measuringSubject,
    measuringLoading,
    resolvedCoastSegmentsLength: resolvedCoastSegments.length,
  });

  const performCommit = useCallback(async () => {
    if (!commitReady) {
      setMeasuringError("Measuring target isn't ready yet. Wait for resolve or retry.");
      return;
    }

    if (!measuringSeekerPoint || measuringDistanceMeters === null) {
      return;
    }

    const committedKind = measuringFromKind(measuringSubject, measuringLocationCategory);

    const locationCategory =
      measuringSubject === "location" ? measuringLocationCategory : undefined;
    const question = measuringQuestionFor(measuringSubject, locationCategory);
    const askPath = resolveAskPath(sessionMode);

    if (askPath === "oracle") {
      const measuringOracleAnswer =
        oracleReceipt?.kind === "measuring" ? oracleReceipt.answer : null;

      if (!measuringOracleAnswer) {
        if (!sessionId || !defenderTeamId) {
          setMeasuringError("Castle Siege ask needs a defender team seal.");
          return;
        }
        if (!onOracleReceipt) {
          setMeasuringError("Confirm-send receipt handler missing.");
          return;
        }

        const targetPoint =
          measuringTargetPoint ?? (measuringSubject === "sea_level" ? measuringSeekerPoint : null);
        if (!targetPoint) {
          setMeasuringError("Castle Siege measuring needs a point target.");
          return;
        }

        const ask: CastleSiegeOracleAskPayload = {
          kind: "measuring",
          seekerPoint: { lat: measuringSeekerPoint[0], lng: measuringSeekerPoint[1] },
          targetPoint: { lat: targetPoint[0], lng: targetPoint[1] },
        };

        try {
          const resolved = await resolveAskAnswer({
            mode: sessionMode,
            honor: async () => null,
            oracle: {
              sessionId,
              defenderTeamId,
              ask,
              callOracle: callOracleAsk,
            },
          });

          if (resolved.path !== "oracle" || resolved.receipt.kind !== "measuring") {
            setMeasuringError("Could not get an oracle answer.");
            return;
          }

          onOracleReceipt(resolved.receipt);
        } catch (error) {
          setMeasuringError(
            error instanceof Error ? error.message : "Could not get an oracle answer.",
          );
        }
        return;
      }

      const regions = await buildMeasuringRegions({
        ...measuringRegionInput,
        measuringAnswer: measuringOracleAnswer,
      });
      if (!regions) {
        setMeasuringError("Couldn't build measure distance regions.");
        return;
      }

      const regionInputWithoutAnswer = buildStoredMeasuringRegionInput({
        measuringSubject,
        measuringLocationCategory,
        measuringDistanceMeters,
        measuringTargetPoint,
        measuringPlaces,
        measuringCoastSegments: resolvedCoastSegments,
        measuringSeaLevelNearRegion,
        usesAllPlacesInArea,
      });
      const measuringRegionInputJson = JSON.stringify(regionInputWithoutAnswer);

      const persisted = persistEliminationOrDeferPoint({
        elimination: regions.elimination,
        deferPoint: seekerAnchorPointFeature(measuringSeekerPoint),
        slim: persistSlimMeasuringGeometry,
      });
      if (persisted.kind === "unavailable") {
        setMeasuringError("Couldn't save this measuring question.");
        return;
      }

      const metadata: AnnotationRecord["metadata"] = {
        createdAt: new Date().toISOString(),
        measuringSubject,
        measuringLocationCategory:
          measuringSubject === "location" ? measuringLocationCategory : undefined,
        measuringAnswer: measuringOracleAnswer,
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
          measuringSubject === "sea_level" ? "Sea level" : (measuringTargetPlaceName ?? undefined),
        measuringRegionInputJson,
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

      let created: AnnotationRecord;
      try {
        created = await createAnnotation({
          type: "measuring",
          geometry: persisted.geometry,
          metadata,
        });
      } catch (error) {
        setMeasuringError(
          error instanceof Error ? error.message : "Couldn't save this measuring question.",
        );
        return;
      }

      if (sessionId) {
        const answerOption = closerFurtherAnswerOptions.find(
          (option) => option.value === measuringOracleAnswer,
        );
        emitQuestionAnsweredActivity({
          sessionId,
          toolType: "measuring",
          promptText: question.prompt,
          annotationId: created.id,
          answerSummary: answerOption?.label ?? String(measuringOracleAnswer),
          createdByUid: senderUid ?? undefined,
          analyticsMode: "self_recorded",
        });
      }

      resetDraft(committedKind);
      setPreviewOpen(false);
      finishPlacement();
      return;
    }

    if (awaitHiderAnswer && submitPendingQuestion && sessionId && senderUid) {
      const { draw: cardDraw, keep: cardKeep } = questionCostBreakdown(
        "D3P1",
        Math.max(
          measuringFromKindUseCount(annotations.filter(isActive), committedKind),
          measuringFromKindUseCountFromPending(pendingQuestions, committedKind),
        ),
      );

      await submitPendingQuestion(
        buildMeasuringPendingInput({
          seekerPoint: measuringSeekerPoint,
          subject: measuringSubject,
          locationCategory: measuringLocationCategory,
          distanceMeters: measuringDistanceMeters,
          targetPoint: measuringTargetPoint,
          targetName: measuringTargetPlaceName,
          places: measuringPlaces,
          coastSegments: resolvedCoastSegments,
          seaLevelNearRegion: measuringSeaLevelNearRegion,
          anchorElevationMeters: measuringAnchorElevationMeters,
          usesAllPlacesInArea,
          cardDraw,
          cardKeep,
        }),
      );

      resetDraft(committedKind);
      finishPlacement();
      return;
    }

    if (measuringAnswer === null) {
      return;
    }

    const regions = await buildMeasuringRegions({
      ...measuringRegionInput,
    });
    if (!regions) {
      setMeasuringError("Couldn't build measure distance regions.");
      return;
    }

    const regionInputWithoutAnswer = buildStoredMeasuringRegionInput({
      measuringSubject,
      measuringLocationCategory,
      measuringDistanceMeters,
      measuringTargetPoint,
      measuringPlaces,
      measuringCoastSegments: resolvedCoastSegments,
      measuringSeaLevelNearRegion,
      usesAllPlacesInArea,
    });
    const measuringRegionInputJson = JSON.stringify(regionInputWithoutAnswer);

    const persisted = persistEliminationOrDeferPoint({
      elimination: regions.elimination,
      deferPoint: seekerAnchorPointFeature(measuringSeekerPoint),
      slim: persistSlimMeasuringGeometry,
    });
    if (persisted.kind === "unavailable") {
      setMeasuringError("Couldn't save this measuring question.");
      return;
    }

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
        measuringSubject === "sea_level" ? "Sea level" : (measuringTargetPlaceName ?? undefined),
      measuringRegionInputJson,
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

    let created: AnnotationRecord;
    try {
      created = await createAnnotation({
        type: "measuring",
        geometry: persisted.geometry,
        metadata,
      });
    } catch (error) {
      setMeasuringError(
        error instanceof Error ? error.message : "Couldn't save this measuring question.",
      );
      return;
    }

    if (sessionId) {
      const answerOption = closerFurtherAnswerOptions.find(
        (option) => option.value === measuringAnswer,
      );
      emitQuestionAnsweredActivity({
        sessionId,
        toolType: "measuring",
        promptText: question.prompt,
        annotationId: created.id,
        answerSummary: answerOption?.label ?? String(measuringAnswer),
        createdByUid: senderUid ?? undefined,
        analyticsMode: "self_recorded",
      });
    }

    resetDraft(committedKind);
    setPreviewOpen(false);
    finishPlacement();
  }, [
    annotations,
    awaitHiderAnswer,
    callOracleAsk,
    commitReady,
    createAnnotation,
    defenderTeamId,
    finishPlacement,
    measuringAnchorElevationMeters,
    measuringAnswer,
    measuringDistanceMeters,
    measuringLocationCategory,
    measuringPlaces,
    measuringRegionInput,
    measuringSeekerPoint,
    measuringSubject,
    measuringSeaLevelNearRegion,
    measuringTargetPlaceName,
    measuringTargetPoint,
    onOracleReceipt,
    oracleReceipt,
    pendingQuestions,
    resetDraft,
    resolvedCoastSegments,
    senderUid,
    sessionId,
    sessionMode,
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

    if (!adminBorderKindAvailability(measureFromKind, adminDivisionCounts, regionPackId)) {
      setMeasuringError("That measure category has already been added.");
      return;
    }

    if (measuringSubject !== "sea_level" && !usesAllPlacesInArea && !measuringTargetPoint) {
      return;
    }

    if (usesAllPlacesInArea && measuringPlaces.length === 0) {
      return;
    }

    if (!commitReady) {
      setMeasuringError("Measuring target isn't ready yet. Wait for resolve or retry.");
      return;
    }

    if (measuringSubject === "sea_level" && !measuringSeaLevelNearRegion) {
      setMeasuringError(
        measuringSeaLevelNote ??
          "Sea level region isn't ready yet. Wait for elevation sampling or tap Retry.",
      );
      return;
    }

    // Castle Siege uses oracle confirm-send instead of the classic preview sheet.
    if (previewBeforeSend && !oracleReceipt && resolveAskPath(sessionMode) !== "oracle") {
      setPreviewOpen(true);
      return;
    }

    await performCommit();
  }, [
    adminDivisionCounts,
    canSubmitQuestion,
    commitReady,
    measureFromKind,
    measuringDistanceMeters,
    measuringPlaces.length,
    measuringSeaLevelNearRegion,
    measuringSeaLevelNote,
    measuringSeekerPoint,
    measuringSubject,
    measuringTargetPoint,
    oracleReceipt,
    performCommit,
    previewBeforeSend,
    regionPackId,
    sessionMode,
    setMeasuringError,
    setPreviewOpen,
    usesAllPlacesInArea,
  ]);

  return { commit, performCommit };
}
