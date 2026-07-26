import type {
  Feature,
  MultiPolygon,
  Point,
  Polygon as GeoPolygon,
} from "geojson";
import type { GameArea } from "../../../domain/map/annotations";
import type { AnnotationRecord } from "../../../domain/map/annotations";
import type { LatLngTuple } from "../../../domain/geometry/geometry";
import {
  buildMatchingEliminationRegion,
  buildSameNearestRegion,
} from "../../../domain/geometry/matchingGeometry";
import {
  matchingQuestionFor,
  type MatchingAnswer,
  type MatchingCategoryId,
} from "../../../domain/questions";
import type { SessionCustomCategory } from "../../../domain/session/sessionCustomContent";
import { yesNoAnswerOptions } from "../../../components/tools/shared/binaryAnswerOptions";
import type { SubmitPendingQuestionInput } from "../../sync/usePendingQuestionActions";
import { serializeMatchingFeatures } from "../../../domain/geo/matchingAdapters";
import type { MatchingFeature } from "../../../services/geo/matchingFeatures";
import { MAP_ANNOTATION_COLORS } from "../../../domain/map/mapAnnotationColors";
import { emitQuestionAnsweredActivity } from "../../../services/session/emitSessionActivity";

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
    input: Omit<
      SubmitPendingQuestionInput,
      "sessionId" | "senderUid" | "senderRole" | "toolType"
    >,
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

export async function performMatchingCommit(
  input: CommitMatchingInput,
): Promise<void> {
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
  } = input;

  if (!matchingSeekerPoint || !matchingCategoryId) {
    return;
  }

  const question = matchingQuestionFor(matchingCategoryId, customCategories);

  if (awaitHiderAnswer && submitPendingQuestion && sessionId && senderUid) {
    const geometry: Feature<Point> = {
      type: "Feature",
      properties: {},
      geometry: {
        type: "Point",
        coordinates: [matchingSeekerPoint[1], matchingSeekerPoint[0]],
      },
    };

    try {
      await submitPendingQuestion({
        promptText: question.prompt,
        replyOptions: [
          ...yesNoAnswerOptions.map((option) => ({
            id: option.value,
            label: option.label,
          })),
          ...(matchingNullAnswer
            ? [{ id: "null", label: "Null (not in play area)" }]
            : []),
        ],
        placement: {
          geometryJson: JSON.stringify(geometry),
          metadata: {
            matchingCategory: matchingCategoryId,
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
            matchingFeaturesJson: serializeMatchingFeatures(matchingFeatures),
            ...(matchingTransitMetroId
              ? { transitMetroId: matchingTransitMetroId }
              : {}),
          },
        },
        cardDraw,
        cardKeep,
      });
    } catch (error) {
      setMatchingError(
        error instanceof Error
          ? error.message
          : "Couldn't send this match question.",
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
    : buildSameNearestRegion(
        matchingFeatures,
        matchingNearestFeatureId!,
        gameArea,
      );
  const eliminationRegion = matchingNullAnswer
    ? null
    : buildMatchingEliminationRegion(
        matchingFeatures,
        matchingNearestFeatureId!,
        gameArea,
        matchingAnswer,
      );

  if (!matchingNullAnswer && (!boundaryRegion || !eliminationRegion)) {
    setMatchingError("Couldn't build matching elimination regions.");
    return;
  }

  const geometry: Feature<Point | GeoPolygon | MultiPolygon> =
    eliminationRegion ?? {
      type: "Feature",
      properties: {},
      geometry: {
        type: "Point",
        coordinates: [matchingSeekerPoint[1], matchingSeekerPoint[0]],
      },
    };

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
        matchingBoundaryJson: boundaryRegion
          ? JSON.stringify(boundaryRegion)
          : undefined,
        matchingFeaturesJson: serializeMatchingFeatures(matchingFeatures),
        ...(matchingTransitMetroId
          ? { transitMetroId: matchingTransitMetroId }
          : {}),
        color: MAP_ANNOTATION_COLORS.elimination,
      },
    });

    if (sessionId) {
      const answerOption = yesNoAnswerOptions.find(
        (option) => option.value === matchingAnswer,
      );
      emitQuestionAnsweredActivity({
        sessionId,
        toolType: "matching",
        promptText: question.prompt,
        annotationId: created.id,
        answerSummary: answerOption?.label ?? String(matchingAnswer),
        createdByUid: senderUid ?? undefined,
      });
    }
  } catch (error) {
    setMatchingError(
      error instanceof Error
        ? error.message
        : "Couldn't save this match question.",
    );
    return;
  }

  setPreviewOpen(false);
  onSuccess();
}
