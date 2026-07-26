import type {
  AnnotationRecord,
  GameArea,
  TentaclePoi,
} from "../../../domain/map/annotations";
import type { LatLngTuple } from "../../../domain/geometry/geometry";
import { tentacleEliminationJsonForAnswer } from "../../../domain/geometry/tentacleGeometry";
import type { DistanceUnit } from "../../../domain/map/distance";
import { MAP_ANNOTATION_COLORS } from "../../../domain/map/mapAnnotationColors";
import {
  TENTACLE_NOT_WITHIN_REACH_LABEL,
  isTentacleCategoryAvailableInSession,
  tentacleQuestionPrompt,
  type TentacleExtendedCategoryId,
} from "../../../domain/questions";
import type { SessionRulesInput } from "../../../domain/session/sessionRules";
import type { SubmitPendingQuestionInput } from "../../sync/usePendingQuestionActions";
import { emitQuestionAnsweredActivity } from "../../../services/session/emitSessionActivity";

export interface CommitTentacleInput {
  canSubmitQuestion: boolean;
  tentacleCategoryChosen: boolean;
  tentacleCategoryId: TentacleExtendedCategoryId | null;
  tentacleCenter: LatLngTuple | null;
  tentaclePois: TentaclePoi[];
  tentacleOutOfReach: boolean;
  selectedPoiId: string | null;
  searchRadiusMeters: number;
  sessionRules: SessionRulesInput;
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
  distanceUnit: DistanceUnit;
  cardDraw: number;
  cardKeep: number;
  createAnnotation: (
    annotation: Omit<AnnotationRecord, "id" | "sessionId" | "status">,
  ) => Promise<AnnotationRecord>;
  setMapError: (message: string | null) => void;
  onSuccess: () => void;
}

export async function commitTentacle(input: CommitTentacleInput): Promise<void> {
  const {
    canSubmitQuestion,
    tentacleCategoryChosen,
    tentacleCategoryId,
    tentacleCenter,
    tentaclePois,
    tentacleOutOfReach,
    selectedPoiId,
    searchRadiusMeters,
    sessionRules,
    gameArea,
    awaitHiderAnswer,
    submitPendingQuestion,
    sessionId,
    senderUid,
    distanceUnit,
    cardDraw,
    cardKeep,
    createAnnotation,
    setMapError,
    onSuccess,
  } = input;

  if (!canSubmitQuestion) {
    setMapError("Finish the open question before starting another.");
    return;
  }

  if (!tentacleCategoryChosen || !tentacleCategoryId) {
    setMapError("Choose a category before sending this question.");
    return;
  }

  if (!tentacleCenter) {
    setMapError("Choose a center with GPS or a map tap.");
    return;
  }

  if (tentaclePois.length === 0) {
    setMapError("No locations found near this anchor.");
    return;
  }

  if (!isTentacleCategoryAvailableInSession(sessionRules, tentacleCategoryId)) {
    setMapError("That location type is not available for this game size.");
    return;
  }

  const geometry = {
    type: "Feature" as const,
    properties: {},
    geometry: {
      type: "Point" as const,
      coordinates: [tentacleCenter[1], tentacleCenter[0]],
    },
  };

  if (awaitHiderAnswer && submitPendingQuestion && sessionId && senderUid) {
    await submitPendingQuestion({
      promptText: tentacleQuestionPrompt(
        tentacleCategoryId,
        distanceUnit,
        searchRadiusMeters,
      ),
      replyOptions: [
        ...tentaclePois.map((poi) => ({
          id: poi.id,
          label: poi.name,
        })),
        {
          id: "out-of-reach",
          label: TENTACLE_NOT_WITHIN_REACH_LABEL,
        },
      ],
      placement: {
        geometryJson: JSON.stringify(geometry),
        metadata: {
          tentacleCategoryId,
          radiusMeters: searchRadiusMeters,
          centerJson: JSON.stringify({
            lat: tentacleCenter[0],
            lng: tentacleCenter[1],
          }),
          poisJson: JSON.stringify(tentaclePois),
        },
      },
      cardDraw,
      cardKeep,
    });

    onSuccess();
    return;
  }

  if (!tentacleOutOfReach && !selectedPoiId) {
    setMapError("Record the answer before adding the tentacle question.");
    return;
  }

  const selectedPoi = tentaclePois.find((poi) => poi.id === selectedPoiId);
  const eliminationJson = tentacleEliminationJsonForAnswer({
    anchor: tentacleCenter,
    radiusMeters: searchRadiusMeters,
    pois: tentaclePois,
    answeredPoiId: selectedPoi?.id,
    outOfReach: tentacleOutOfReach,
    gameArea,
  });

  const metadata: AnnotationRecord["metadata"] = {
    createdAt: new Date().toISOString(),
    radiusMeters: searchRadiusMeters,
    tentacleCategoryId,
    tentacleOutOfReach,
    highlightedPoiId: selectedPoi?.id,
    tentacleAnswerPoiName: selectedPoi?.name,
    poiIds: tentaclePois.map((poi) => poi.id),
    pois: tentaclePois,
    color: MAP_ANNOTATION_COLORS.tentacle,
  };
  if (eliminationJson !== undefined) {
    metadata.tentacleEliminationJson = eliminationJson;
  }

  const created = await createAnnotation({
    type: "tentacle",
    geometry: {
      type: "Feature",
      properties: {},
      geometry: {
        type: "Point",
        coordinates: [tentacleCenter[1], tentacleCenter[0]],
      },
    },
    metadata,
  });

  if (sessionId) {
    emitQuestionAnsweredActivity({
      sessionId,
      toolType: "tentacle",
      promptText: tentacleQuestionPrompt(
        tentacleCategoryId,
        distanceUnit,
        searchRadiusMeters,
      ),
      annotationId: created.id,
      answerSummary: tentacleOutOfReach
        ? TENTACLE_NOT_WITHIN_REACH_LABEL
        : (selectedPoi?.name ?? selectedPoiId ?? undefined),
      createdByUid: senderUid ?? undefined,
    });
  }

  onSuccess();
}
