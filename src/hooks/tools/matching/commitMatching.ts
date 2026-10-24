import type { Feature, Polygon as GeoPolygon, MultiPolygon, Point } from "geojson";
import { yesNoAnswerOptions } from "@/components/tools/shared/answers/binaryAnswerOptions";
import { serializeMatchingFeatures } from "@/domain/geo/matchingAdapters";
import type { LatLngTuple } from "@/domain/geometry/gameArea/geometry";
import {
  buildMatchingEliminationRegion,
  buildSameNearestRegion,
} from "@/domain/geometry/measuring/matchingGeometry";
import { persistEliminationOrDeferPoint } from "@/domain/geometry/progressive/persistEliminationOrDeferPoint";
import { persistSlimPolygonFeature } from "@/domain/geometry/progressive/persistSlim";
import type { AnnotationRecord, GameArea } from "@/domain/map/annotations";
import { MAP_ANNOTATION_COLORS } from "@/domain/map/mapAnnotationColors";
import {
  type MatchingAnswer,
  type MatchingCategoryId,
  matchingQuestionFor,
} from "@/domain/questions";
import { seekerAnchorPointFeature } from "@/domain/questions/deferredSeekerPoint";
import type { SessionMode } from "@/domain/session/castleSiege/mode";
import type { CastleSiegeOracleReceipt } from "@/domain/session/castleSiege/oracleAskReceipt";
import type { CastleSiegePlayingTeam } from "@/domain/session/castleSiege/pregame";
import { resolveAskPath } from "@/domain/session/castleSiege/resolveAskPath";
import type { SessionCustomCategory } from "@/domain/session/catalog/sessionCustomContent";
import type { MatchingFeature } from "@/services/geo/matching";
import type {
  AnswerCastleSiegeOracleAskFn,
  CastleSiegeOracleAskPayload,
} from "@/services/session/castleSiegeOracleAsk";
import { resolveAskAnswer } from "@/services/session/castleSiegeOracleAsk";
import { emitQuestionAnsweredActivity } from "@/services/session/emitSessionActivity";
import type { SubmitPendingQuestionInput } from "../../sync/usePendingQuestionActions";
import { buildMatchingPendingInput } from "./matchingPendingInput";

export interface CommitMatchingInput {
  canSubmitQuestion: boolean;
  matchingSeekerPoint: LatLngTuple | null;
  matchingCategoryId: MatchingCategoryId | null;
  matchingNullAnswer: boolean;
  matchingNearestFeatureId: string | null;
  matchingNearestFeatureName: string | null;
  matchingNearestFeaturePoint: LatLngTuple | null;
  matchingDistanceMeters: number | null;
  matchingFeatureCount: number | null;
  matchingFeatures: MatchingFeature[];
  matchingAnswer: MatchingAnswer | null;
  matchingTransitMetroId: string | null;
  previewBeforeSend: boolean;
  customCategories: readonly SessionCustomCategory[];
  gameArea: GameArea;
  awaitHiderAnswer: boolean;
  submitPendingQuestion?: (
    input: Omit<SubmitPendingQuestionInput, "sessionId" | "senderUid" | "senderRole" | "toolType">,
  ) => Promise<void>;
  sessionId?: string;
  senderUid?: string | null;
  cardDraw: number;
  cardKeep: number;
  createAnnotation: (
    annotation: Omit<AnnotationRecord, "id" | "sessionId" | "status">,
  ) => Promise<AnnotationRecord>;
  setMatchingError: (message: string | null) => void;
  setPreviewOpen: (open: boolean) => void;
  onSuccess: () => void;
  /** When set, Castle Siege routes through oracle instead of honor typing. */
  sessionMode?: SessionMode | null;
  defenderTeamId?: CastleSiegePlayingTeam;
  callOracleAsk?: AnswerCastleSiegeOracleAskFn;
  oracleReceipt?: Extract<CastleSiegeOracleReceipt, { kind: "matching" }> | null;
  onOracleReceipt?: (receipt: Extract<CastleSiegeOracleReceipt, { kind: "matching" }>) => void;
}

export async function commitMatching(
  input: CommitMatchingInput,
): Promise<"preview" | "done" | "noop"> {
  const {
    canSubmitQuestion,
    matchingSeekerPoint,
    matchingCategoryId,
    matchingNullAnswer,
    matchingNearestFeatureId,
    previewBeforeSend,
    setMatchingError,
  } = input;

  if (!canSubmitQuestion) {
    setMatchingError("Finish the open question before starting another.");
    return "noop";
  }

  if (!matchingSeekerPoint || !matchingCategoryId) {
    return "noop";
  }

  // Empty play-area catalog must bounce, not send a null match.
  if (
    matchingNullAnswer &&
    (input.matchingFeatureCount === 0 || input.matchingFeatures.length === 0)
  ) {
    return "noop";
  }

  if (!matchingNullAnswer && !matchingNearestFeatureId) {
    return "noop";
  }

  if (previewBeforeSend) {
    input.setPreviewOpen(true);
    return "preview";
  }

  await performMatchingCommit(input);
  return "done";
}

export async function performMatchingCommit(input: CommitMatchingInput): Promise<void> {
  const {
    matchingSeekerPoint,
    matchingCategoryId,
    matchingNullAnswer,
    matchingNearestFeatureId,
    matchingNearestFeatureName,
    matchingNearestFeaturePoint,
    matchingDistanceMeters,
    matchingFeatureCount,
    matchingFeatures,
    matchingAnswer,
    matchingTransitMetroId,
    customCategories,
    gameArea,
    awaitHiderAnswer,
    submitPendingQuestion,
    sessionId,
    senderUid,
    cardDraw,
    cardKeep,
    createAnnotation,
    setMatchingError,
    setPreviewOpen,
    onSuccess,
    sessionMode,
    defenderTeamId,
    callOracleAsk,
    oracleReceipt,
    onOracleReceipt,
  } = input;

  if (!matchingSeekerPoint || !matchingCategoryId) {
    return;
  }

  // Empty play-area catalog must bounce, not send a null match (preview path
  // calls this directly and must not bypass the outer commitMatching guard).
  if (matchingNullAnswer && (matchingFeatureCount === 0 || matchingFeatures.length === 0)) {
    return;
  }

  const question = matchingQuestionFor(matchingCategoryId, customCategories);
  const askPath = resolveAskPath(sessionMode);

  if (askPath === "oracle") {
    const matchingOracleAnswer = oracleReceipt?.kind === "matching" ? oracleReceipt.answer : null;

    if (!matchingOracleAnswer) {
      if (!sessionId || !defenderTeamId) {
        setMatchingError("Castle Siege ask needs a defender team seal.");
        return;
      }
      if (!onOracleReceipt) {
        setMatchingError("Confirm-send receipt handler missing.");
        return;
      }

      const ask: CastleSiegeOracleAskPayload = {
        kind: "matching",
        seekerFeatureId: matchingNearestFeatureId ?? "",
        features: matchingFeatures.map((feature) => ({
          id: feature.id,
          lat: feature.point[0],
          lng: feature.point[1],
        })),
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

        if (resolved.path !== "oracle" || resolved.receipt.kind !== "matching") {
          setMatchingError("Could not get an oracle answer.");
          return;
        }

        onOracleReceipt(resolved.receipt);
      } catch (error) {
        setMatchingError(
          error instanceof Error ? error.message : "Could not get an oracle answer.",
        );
      }
      return;
    }

    const effectiveNullAnswer = matchingNullAnswer || matchingOracleAnswer === "null";
    const effectiveAnswer: MatchingAnswer | null =
      matchingOracleAnswer === "yes" || matchingOracleAnswer === "no" ? matchingOracleAnswer : null;

    if (!effectiveNullAnswer && (!effectiveAnswer || !matchingNearestFeatureId)) {
      setMatchingError("Could not apply oracle match answer.");
      return;
    }

    const boundaryRegion = effectiveNullAnswer
      ? null
      : await buildSameNearestRegion(matchingFeatures, matchingNearestFeatureId!, gameArea);
    const eliminationRegion =
      effectiveNullAnswer || !effectiveAnswer
        ? null
        : await buildMatchingEliminationRegion(
            matchingFeatures,
            matchingNearestFeatureId!,
            gameArea,
            effectiveAnswer,
          );

    if (!effectiveNullAnswer && (!boundaryRegion || !eliminationRegion)) {
      setMatchingError("Couldn't build matching elimination regions.");
      return;
    }

    let storedBoundary = boundaryRegion;
    if (storedBoundary) {
      const slimmedBoundary = persistSlimPolygonFeature(storedBoundary);
      storedBoundary = slimmedBoundary.ok ? slimmedBoundary.feature : null;
    }

    let geometry: Feature<Point | GeoPolygon | MultiPolygon>;
    if (eliminationRegion) {
      const persisted = persistEliminationOrDeferPoint({
        elimination: eliminationRegion,
        deferPoint: seekerAnchorPointFeature(matchingSeekerPoint),
      });
      if (persisted.kind === "unavailable") {
        setMatchingError("Couldn't save this match question.");
        return;
      }
      geometry = persisted.geometry;
    } else {
      geometry = seekerAnchorPointFeature(matchingSeekerPoint);
    }

    try {
      const created = await createAnnotation({
        type: "matching",
        geometry,
        metadata: {
          createdAt: new Date().toISOString(),
          matchingCategory: matchingCategoryId,
          ...(effectiveAnswer ? { matchingAnswer: effectiveAnswer } : {}),
          matchingAnchor: {
            lat: matchingSeekerPoint[0],
            lng: matchingSeekerPoint[1],
          },
          matchingNearestFeatureId: matchingNearestFeatureId ?? undefined,
          matchingNearestFeatureName: matchingNearestFeatureName ?? undefined,
          matchingNearestFeaturePoint: matchingNearestFeaturePoint
            ? {
                lat: matchingNearestFeaturePoint[0],
                lng: matchingNearestFeaturePoint[1],
              }
            : undefined,
          matchingDistanceMeters: matchingDistanceMeters ?? undefined,
          matchingFeatureCount: matchingFeatureCount ?? undefined,
          matchingNullAnswer: effectiveNullAnswer,
          matchingBoundaryJson: storedBoundary ? JSON.stringify(storedBoundary) : undefined,
          matchingFeaturesJson: serializeMatchingFeatures(matchingFeatures),
          ...(matchingTransitMetroId ? { transitMetroId: matchingTransitMetroId } : {}),
          color: MAP_ANNOTATION_COLORS.elimination,
        },
      });

      if (sessionId) {
        const answerSummary =
          matchingOracleAnswer === "null"
            ? "Null (not in play area)"
            : (yesNoAnswerOptions.find((option) => option.value === matchingOracleAnswer)?.label ??
              String(matchingOracleAnswer));
        emitQuestionAnsweredActivity({
          sessionId,
          toolType: "matching",
          promptText: question.prompt,
          annotationId: created.id,
          answerSummary,
          createdByUid: senderUid ?? undefined,
          analyticsMode: "self_recorded",
        });
      }
    } catch (error) {
      setMatchingError(
        error instanceof Error ? error.message : "Couldn't save this match question.",
      );
      return;
    }

    setPreviewOpen(false);
    onSuccess();
    return;
  }

  if (awaitHiderAnswer && submitPendingQuestion && sessionId && senderUid) {
    try {
      await submitPendingQuestion(
        buildMatchingPendingInput({
          seekerPoint: matchingSeekerPoint,
          categoryId: matchingCategoryId,
          customCategories,
          nullAnswer: matchingNullAnswer,
          nearestFeatureId: matchingNearestFeatureId,
          nearestFeatureName: matchingNearestFeatureName,
          nearestFeaturePoint: matchingNearestFeaturePoint,
          distanceMeters: matchingDistanceMeters,
          featureCount: matchingFeatureCount,
          features: matchingFeatures,
          transitMetroId: matchingTransitMetroId,
          cardDraw,
          cardKeep,
        }),
      );
    } catch (error) {
      setMatchingError(
        error instanceof Error ? error.message : "Couldn't send this match question.",
      );
      return;
    }

    onSuccess();
    return;
  }

  if (matchingAnswer === null) {
    return;
  }

  const boundaryRegion = matchingNullAnswer
    ? null
    : await buildSameNearestRegion(matchingFeatures, matchingNearestFeatureId!, gameArea);
  const eliminationRegion = matchingNullAnswer
    ? null
    : await buildMatchingEliminationRegion(
        matchingFeatures,
        matchingNearestFeatureId!,
        gameArea,
        matchingAnswer,
      );

  if (!matchingNullAnswer && (!boundaryRegion || !eliminationRegion)) {
    setMatchingError("Couldn't build matching elimination regions.");
    return;
  }

  let storedBoundary = boundaryRegion;
  if (storedBoundary) {
    const slimmedBoundary = persistSlimPolygonFeature(storedBoundary);
    // Boundary is best-effort: omit JSON when over budget (same as MP resolve).
    storedBoundary = slimmedBoundary.ok ? slimmedBoundary.feature : null;
  }

  let geometry: Feature<Point | GeoPolygon | MultiPolygon>;
  if (eliminationRegion) {
    const persisted = persistEliminationOrDeferPoint({
      elimination: eliminationRegion,
      deferPoint: seekerAnchorPointFeature(matchingSeekerPoint),
    });
    if (persisted.kind === "unavailable") {
      setMatchingError("Couldn't save this match question.");
      return;
    }
    geometry = persisted.geometry;
  } else {
    geometry = seekerAnchorPointFeature(matchingSeekerPoint);
  }

  try {
    const created = await createAnnotation({
      type: "matching",
      geometry,
      metadata: {
        createdAt: new Date().toISOString(),
        matchingCategory: matchingCategoryId,
        matchingAnswer,
        matchingAnchor: {
          lat: matchingSeekerPoint[0],
          lng: matchingSeekerPoint[1],
        },
        matchingNearestFeatureId: matchingNearestFeatureId ?? undefined,
        matchingNearestFeatureName: matchingNearestFeatureName ?? undefined,
        matchingNearestFeaturePoint: matchingNearestFeaturePoint
          ? {
              lat: matchingNearestFeaturePoint[0],
              lng: matchingNearestFeaturePoint[1],
            }
          : undefined,
        matchingDistanceMeters: matchingDistanceMeters ?? undefined,
        matchingFeatureCount: matchingFeatureCount ?? undefined,
        matchingNullAnswer,
        matchingBoundaryJson: storedBoundary ? JSON.stringify(storedBoundary) : undefined,
        matchingFeaturesJson: serializeMatchingFeatures(matchingFeatures),
        ...(matchingTransitMetroId ? { transitMetroId: matchingTransitMetroId } : {}),
        color: MAP_ANNOTATION_COLORS.elimination,
      },
    });

    if (sessionId) {
      const answerOption = yesNoAnswerOptions.find((option) => option.value === matchingAnswer);
      emitQuestionAnsweredActivity({
        sessionId,
        toolType: "matching",
        promptText: question.prompt,
        annotationId: created.id,
        answerSummary: answerOption?.label ?? String(matchingAnswer),
        createdByUid: senderUid ?? undefined,
        analyticsMode: "self_recorded",
      });
    }
  } catch (error) {
    setMatchingError(error instanceof Error ? error.message : "Couldn't save this match question.");
    return;
  }

  setPreviewOpen(false);
  onSuccess();
}
