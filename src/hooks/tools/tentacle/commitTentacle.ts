import type { LatLngTuple } from "@/domain/geometry/gameArea/geometry";
import { MEASURING_PERSIST_OVER_BUDGET_MESSAGE } from "@/domain/geometry/measuring/measuringGeometryBudgets";
import { POLYGON_PERSIST_OVER_BUDGET_MESSAGE } from "@/domain/geometry/progressive/persistSlim";
import { tentacleEliminationJsonForAnswer } from "@/domain/geometry/tentacle/tentacleGeometry";
import type { AnnotationRecord, GameArea, TentaclePoi } from "@/domain/map/annotations";
import type { DistanceUnit } from "@/domain/map/distance";
import { MAP_ANNOTATION_COLORS } from "@/domain/map/mapAnnotationColors";
import {
  isTentacleCategoryAvailableInSession,
  TENTACLE_NOT_WITHIN_REACH_LABEL,
  type TentacleExtendedCategoryId,
  tentacleQuestionPrompt,
} from "@/domain/questions";
import type { SessionMode } from "@/domain/session/castleSiege/mode";
import type { CastleSiegeOracleReceipt } from "@/domain/session/castleSiege/oracleAskReceipt";
import type { CastleSiegePlayingTeam } from "@/domain/session/castleSiege/pregame";
import { resolveAskPath } from "@/domain/session/castleSiege/resolveAskPath";
import type { SessionRulesInput } from "@/domain/session/rules";
import type {
  AnswerCastleSiegeOracleAskFn,
  CastleSiegeOracleAskPayload,
} from "@/services/session/castleSiegeOracleAsk";
import { resolveAskAnswer } from "@/services/session/castleSiegeOracleAsk";
import { emitQuestionAnsweredActivity } from "@/services/session/emitSessionActivity";
import type { SubmitPendingQuestionInput } from "../../sync/usePendingQuestionActions";
import { buildTentaclePendingInput } from "./tentaclePendingInput";

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
    input: Omit<SubmitPendingQuestionInput, "sessionId" | "senderUid" | "senderRole" | "toolType">,
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
  sessionMode?: SessionMode | null;
  defenderTeamId?: CastleSiegePlayingTeam;
  callOracleAsk?: AnswerCastleSiegeOracleAskFn;
  oracleReceipt?: Extract<CastleSiegeOracleReceipt, { kind: "tentacle" }> | null;
  onOracleReceipt?: (receipt: Extract<CastleSiegeOracleReceipt, { kind: "tentacle" }>) => void;
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
    sessionMode,
    defenderTeamId,
    callOracleAsk,
    oracleReceipt,
    onOracleReceipt,
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

  const askPath = resolveAskPath(sessionMode);

  if (askPath === "oracle") {
    const tentacleOracleAnswer = oracleReceipt?.kind === "tentacle" ? oracleReceipt.answer : null;

    if (!tentacleOracleAnswer) {
      if (!sessionId || !defenderTeamId) {
        setMapError("Castle Siege ask needs a defender team seal.");
        return;
      }
      if (!onOracleReceipt) {
        setMapError("Confirm-send receipt handler missing.");
        return;
      }

      const ask: CastleSiegeOracleAskPayload = {
        kind: "tentacle",
        center: { lat: tentacleCenter[0], lng: tentacleCenter[1] },
        radiusMeters: searchRadiusMeters,
        pois: tentaclePois.map((poi) => ({
          id: poi.id,
          lat: poi.lat,
          lng: poi.lng,
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

        if (resolved.path !== "oracle" || resolved.receipt.kind !== "tentacle") {
          setMapError("Could not get an oracle answer.");
          return;
        }

        onOracleReceipt(resolved.receipt);
      } catch (error) {
        setMapError(
          error instanceof Error && error.message.trim()
            ? error.message
            : "Could not get an oracle answer.",
        );
      }
      return;
    }

    const outOfReach = tentacleOracleAnswer === "out-of-reach";
    const answeredPoiId = outOfReach ? null : tentacleOracleAnswer;
    const selectedPoi = answeredPoiId
      ? tentaclePois.find((poi) => poi.id === answeredPoiId)
      : undefined;

    let eliminationJson: string | undefined;
    try {
      eliminationJson = await tentacleEliminationJsonForAnswer({
        anchor: tentacleCenter,
        radiusMeters: searchRadiusMeters,
        pois: tentaclePois,
        answeredPoiId: selectedPoi?.id,
        outOfReach,
        gameArea,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (
        message === MEASURING_PERSIST_OVER_BUDGET_MESSAGE ||
        message === POLYGON_PERSIST_OVER_BUDGET_MESSAGE
      ) {
        eliminationJson = undefined;
      } else {
        setMapError(message || MEASURING_PERSIST_OVER_BUDGET_MESSAGE);
        return;
      }
    }

    const metadata: AnnotationRecord["metadata"] = {
      createdAt: new Date().toISOString(),
      radiusMeters: searchRadiusMeters,
      tentacleCategoryId,
      tentacleOutOfReach: outOfReach,
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
        promptText: tentacleQuestionPrompt(tentacleCategoryId, distanceUnit, searchRadiusMeters),
        annotationId: created.id,
        answerSummary: outOfReach
          ? TENTACLE_NOT_WITHIN_REACH_LABEL
          : (selectedPoi?.name ?? answeredPoiId ?? undefined),
        createdByUid: senderUid ?? undefined,
        analyticsMode: "self_recorded",
      });
    }

    onSuccess();
    return;
  }

  if (awaitHiderAnswer && submitPendingQuestion && sessionId && senderUid) {
    await submitPendingQuestion(
      buildTentaclePendingInput({
        center: tentacleCenter,
        categoryId: tentacleCategoryId,
        pois: tentaclePois,
        searchRadiusMeters,
        distanceUnit,
        cardDraw,
        cardKeep,
      }),
    );

    onSuccess();
    return;
  }

  if (!tentacleOutOfReach && !selectedPoiId) {
    setMapError("Record the answer before adding the tentacle question.");
    return;
  }

  const selectedPoi = tentaclePois.find((poi) => poi.id === selectedPoiId);
  let eliminationJson: string | undefined;
  try {
    eliminationJson = await tentacleEliminationJsonForAnswer({
      anchor: tentacleCenter,
      radiusMeters: searchRadiusMeters,
      pois: tentaclePois,
      answeredPoiId: selectedPoi?.id,
      outOfReach: tentacleOutOfReach,
      gameArea,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (
      message === MEASURING_PERSIST_OVER_BUDGET_MESSAGE ||
      message === POLYGON_PERSIST_OVER_BUDGET_MESSAGE
    ) {
      eliminationJson = undefined;
    } else {
      setMapError(message || MEASURING_PERSIST_OVER_BUDGET_MESSAGE);
      return;
    }
  }

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
      promptText: tentacleQuestionPrompt(tentacleCategoryId, distanceUnit, searchRadiusMeters),
      annotationId: created.id,
      answerSummary: tentacleOutOfReach
        ? TENTACLE_NOT_WITHIN_REACH_LABEL
        : (selectedPoi?.name ?? selectedPoiId ?? undefined),
      createdByUid: senderUid ?? undefined,
      analyticsMode: "self_recorded",
    });
  }

  onSuccess();
}
