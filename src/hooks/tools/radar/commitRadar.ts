import type { Feature, Point } from "geojson";
import type { LatLngTuple } from "../../../domain/geometry/gameArea/geometry";
import type { AnnotationRecord } from "../../../domain/map/annotations";
import type { DistanceUnit } from "../../../domain/map/distance";
import { MAP_ANNOTATION_COLORS } from "../../../domain/map/mapAnnotationColors";
import {
  isRadarDistanceOptionUsed,
  isRadarRadiusAllowedForGameSize,
  radarInsideFromAnswer,
  radarQuestionPrompt,
  type RadarAnswer,
  type RadarDistanceOptionKey,
} from "../../../domain/questions";
import type { GameSize } from "../../../domain/session/size/gameSize";
import type { SubmitPendingQuestionInput } from "../../sync/usePendingQuestionActions";
import { yesNoAnswerOptions } from "../../../components/tools/shared/answers/binaryAnswerOptions";
import { emitQuestionAnsweredActivity } from "../../../services/session/emitSessionActivity";

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
  setMapError: (message: string | null) => void;
  onSuccess: () => void;
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
    !isRadarRadiusAllowedForGameSize(
      gameSize,
      resolvedRadarRadius,
      distanceUnit,
      radarChooseCustom,
    )
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
      const answerOption = yesNoAnswerOptions.find(
        (option) => option.value === radarAnswer,
      );
      emitQuestionAnsweredActivity({
        sessionId,
        toolType: "radar",
        promptText: radarQuestionPrompt(resolvedRadarRadius, distanceUnit),
        annotationId: created.id,
        answerSummary: answerOption?.label ?? String(radarAnswer),
        createdByUid: senderUid ?? undefined,
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
