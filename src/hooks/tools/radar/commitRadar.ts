import type { Feature, Point } from "geojson";
import { yesNoAnswerOptions } from "../../../components/tools/shared/answers/binaryAnswerOptions";
import type { LatLngTuple } from "../../../domain/geometry/gameArea/geometry";
import type { AnnotationRecord } from "../../../domain/map/annotations";
import type { DistanceUnit } from "../../../domain/map/distance";
import { MAP_ANNOTATION_COLORS } from "../../../domain/map/mapAnnotationColors";
import {
  isRadarDistanceOptionUsed,
  isRadarRadiusAllowedForGameSize,
  type RadarAnswer,
  type RadarDistanceOptionKey,
  radarInsideFromAnswer,
  radarQuestionPrompt,
} from "../../../domain/questions";
import type { SessionMode } from "../../../domain/session/castleSiege/mode";
import type { CastleSiegeOracleReceipt } from "../../../domain/session/castleSiege/oracleAskReceipt";
import type { CastleSiegePlayingTeam } from "../../../domain/session/castleSiege/pregame";
import { resolveAskPath } from "../../../domain/session/castleSiege/resolveAskPath";
import type { GameSize } from "../../../domain/session/size/gameSize";
import type {
  AnswerCastleSiegeOracleAskFn,
  CastleSiegeOracleAskPayload,
} from "../../../services/session/castleSiegeOracleAsk";
import { resolveAskAnswer } from "../../../services/session/castleSiegeOracleAsk";
import { emitQuestionAnsweredActivity } from "../../../services/session/emitSessionActivity";
import type { SubmitPendingQuestionInput } from "../../sync/usePendingQuestionActions";

export interface CommitRadarInput {
  canSubmitQuestion: boolean;
  radarCenter: LatLngTuple | null;
  radarRadius: number | null;
  radarChooseCustom: boolean;
  resolvedRadarRadius: number;
  radarAnswer: RadarAnswer | null;
  gameSize: GameSize;
  distanceUnit: DistanceUnit;
  usedRadarOptions: ReadonlySet<RadarDistanceOptionKey>;
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
  setMapError: (message: string | null) => void;
  onSuccess: () => void;
  sessionMode?: SessionMode | null;
  defenderTeamId?: CastleSiegePlayingTeam;
  callOracleAsk?: AnswerCastleSiegeOracleAskFn;
  oracleReceipt?: Extract<CastleSiegeOracleReceipt, { kind: "radar" }> | null;
  onOracleReceipt?: (receipt: Extract<CastleSiegeOracleReceipt, { kind: "radar" }>) => void;
}

export async function commitRadar(input: CommitRadarInput): Promise<void> {
  const {
    canSubmitQuestion,
    radarCenter,
    radarRadius,
    radarChooseCustom,
    resolvedRadarRadius,
    radarAnswer,
    gameSize,
    distanceUnit,
    usedRadarOptions,
    awaitHiderAnswer,
    submitPendingQuestion,
    sessionId,
    senderUid,
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

  if (!radarCenter) {
    setMapError("Choose a center with GPS or a map tap.");
    return;
  }

  if (radarRadius === null && !radarChooseCustom) {
    setMapError("Choose a radar distance.");
    return;
  }

  if (
    !isRadarRadiusAllowedForGameSize(gameSize, resolvedRadarRadius, distanceUnit, radarChooseCustom)
  ) {
    setMapError("That radar distance exceeds the limit for this game size.");
    return;
  }

  if (
    isRadarDistanceOptionUsed(
      usedRadarOptions,
      radarChooseCustom,
      resolvedRadarRadius,
      distanceUnit,
    )
  ) {
    setMapError("That radar distance was already used this session.");
    return;
  }

  const geometry: Feature<Point> = {
    type: "Feature",
    properties: {},
    geometry: {
      type: "Point",
      coordinates: [radarCenter[1], radarCenter[0]],
    },
  };

  try {
    const askPath = resolveAskPath(sessionMode);

    if (askPath === "oracle") {
      const radarOracleAnswer: "yes" | "no" | null =
        oracleReceipt?.kind === "radar" ? oracleReceipt.answer : null;

      if (!radarOracleAnswer) {
        if (!sessionId || !defenderTeamId) {
          setMapError("Castle Siege ask needs a defender team seal.");
          return;
        }
        if (!onOracleReceipt) {
          setMapError("Confirm-send receipt handler missing.");
          return;
        }

        const ask: CastleSiegeOracleAskPayload = {
          kind: "radar",
          point: { lat: radarCenter[0], lng: radarCenter[1] },
          radiusMeters: resolvedRadarRadius,
        };

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

        if (resolved.path !== "oracle" || resolved.receipt.kind !== "radar") {
          setMapError("Could not get an oracle answer.");
          return;
        }

        onOracleReceipt(resolved.receipt);
        return;
      }

      const created = await createAnnotation({
        type: "radar",
        geometry,
        metadata: {
          createdAt: new Date().toISOString(),
          radiusMeters: resolvedRadarRadius,
          radarChooseCustom,
          inside: radarInsideFromAnswer(radarOracleAnswer),
          color: MAP_ANNOTATION_COLORS.radar,
        },
      });

      if (sessionId) {
        const answerOption = yesNoAnswerOptions.find(
          (option) => option.value === radarOracleAnswer,
        );
        emitQuestionAnsweredActivity({
          sessionId,
          toolType: "radar",
          promptText: radarQuestionPrompt(resolvedRadarRadius, distanceUnit),
          annotationId: created.id,
          answerSummary: answerOption?.label ?? String(radarOracleAnswer),
          createdByUid: senderUid ?? undefined,
          analyticsMode: "self_recorded",
        });
      }

      onSuccess();
      return;
    }

    if (awaitHiderAnswer && submitPendingQuestion && sessionId && senderUid) {
      await submitPendingQuestion({
        promptText: radarQuestionPrompt(resolvedRadarRadius, distanceUnit),
        replyOptions: yesNoAnswerOptions.map((option) => ({
          id: option.value,
          label: option.label,
        })),
        placement: {
          geometryJson: JSON.stringify(geometry),
          metadata: {
            radiusMeters: resolvedRadarRadius,
            radarChooseCustom,
          },
        },
        cardDraw,
        cardKeep,
      });

      onSuccess();
      return;
    }

    if (!radarAnswer) {
      setMapError("Record the answer before adding the radar question.");
      return;
    }

    const created = await createAnnotation({
      type: "radar",
      geometry,
      metadata: {
        createdAt: new Date().toISOString(),
        radiusMeters: resolvedRadarRadius,
        radarChooseCustom,
        inside: radarInsideFromAnswer(radarAnswer),
        color: MAP_ANNOTATION_COLORS.radar,
      },
    });

    if (sessionId) {
      const answerOption = yesNoAnswerOptions.find((option) => option.value === radarAnswer);
      emitQuestionAnsweredActivity({
        sessionId,
        toolType: "radar",
        promptText: radarQuestionPrompt(resolvedRadarRadius, distanceUnit),
        annotationId: created.id,
        answerSummary: answerOption?.label ?? String(radarAnswer),
        createdByUid: senderUid ?? undefined,
        analyticsMode: "self_recorded",
      });
    }

    onSuccess();
  } catch (error) {
    setMapError(
      error instanceof Error && error.message.trim()
        ? error.message
        : "Could not save the radar question.",
    );
  }
}
