import type { Feature, LineString } from "geojson";
import { hotterColderAnswerOptions } from "@/components/tools/shared/answers/binaryAnswerOptions";
import type { LatLngTuple } from "@/domain/geometry/gameArea/geometry";
import type { AnnotationRecord } from "@/domain/map/annotations";
import type { DistanceUnit } from "@/domain/map/distance";
import { MAP_ANNOTATION_COLORS } from "@/domain/map/mapAnnotationColors";
import {
  hasOpenPendingQuestion,
  isThermometerDistanceOptionUsed,
  type ThermometerAnswer,
  type ThermometerDistanceOptionMiles,
  thermometerHotterTowards,
  thermometerQuestionPrompt,
} from "@/domain/questions";
import type { PendingQuestionRecord } from "@/domain/session/activity/sessionChat";
import { emitQuestionAnsweredActivity } from "@/services/session/emitSessionActivity";
import type { SubmitPendingQuestionInput } from "../../sync/usePendingQuestionActions";

export interface CommitThermometerManualInput {
  thermoA: LatLngTuple;
  thermoB: LatLngTuple;
  thermoTravelMeters: number | null;
  distanceMeters: number;
  answer: ThermometerAnswer | null;
  pendingQuestions: readonly PendingQuestionRecord[];
  awaitHiderAnswer: boolean;
  submitPendingQuestion?: (
    input: Omit<SubmitPendingQuestionInput, "sessionId" | "senderUid" | "senderRole" | "toolType">,
  ) => Promise<string | undefined>;
  sessionId?: string;
  senderUid?: string | null;
  distanceUnit: DistanceUnit;
  cardDraw: number;
  cardKeep: number;
  usedThermometerOptions?: ReadonlySet<ThermometerDistanceOptionMiles>;
  createAnnotation: (
    annotation: Omit<AnnotationRecord, "id" | "sessionId" | "status">,
  ) => Promise<AnnotationRecord>;
  setMapError: (message: string | null) => void;
  onSuccess: () => void;
}

export async function commitThermometerManual(input: CommitThermometerManualInput): Promise<void> {
  const {
    thermoA,
    thermoB,
    thermoTravelMeters,
    distanceMeters,
    answer,
    pendingQuestions,
    awaitHiderAnswer,
    submitPendingQuestion,
    sessionId,
    senderUid,
    distanceUnit,
    cardDraw,
    cardKeep,
    usedThermometerOptions = new Set(),
    createAnnotation,
    setMapError,
    onSuccess,
  } = input;

  if (hasOpenPendingQuestion(pendingQuestions)) {
    setMapError("Finish the current question before starting another.");
    return;
  }

  if (thermoTravelMeters !== null && thermoTravelMeters + 1 < distanceMeters) {
    setMapError("Movement is shorter than the selected distance.");
    return;
  }

  if (isThermometerDistanceOptionUsed(usedThermometerOptions, distanceMeters)) {
    setMapError("That thermometer distance was already used this session.");
    return;
  }

  const geometry: Feature<LineString> = {
    type: "Feature",
    properties: {},
    geometry: {
      type: "LineString",
      coordinates: [
        [thermoA[1], thermoA[0]],
        [thermoB[1], thermoB[0]],
      ],
    },
  };

  const promptText = thermometerQuestionPrompt(distanceMeters, distanceUnit);

  if (awaitHiderAnswer && submitPendingQuestion && sessionId && senderUid) {
    await submitPendingQuestion({
      promptText,
      replyOptions: hotterColderAnswerOptions.map((option) => ({
        id: option.value,
        label: option.label,
      })),
      placement: {
        geometryJson: JSON.stringify(geometry),
        metadata: { thermometerDistanceMeters: distanceMeters },
      },
      status: "pending",
      cardDraw,
      cardKeep,
    });

    onSuccess();
    return;
  }

  if (answer === null) {
    return;
  }

  const created = await createAnnotation({
    type: "thermometer",
    geometry,
    metadata: {
      createdAt: new Date().toISOString(),
      hotterTowards: thermometerHotterTowards(answer),
      thermometerDistanceMeters: distanceMeters,
      thermometerAnswer: answer,
      color: MAP_ANNOTATION_COLORS.elimination,
    },
  });

  if (sessionId) {
    const answerOption = hotterColderAnswerOptions.find((option) => option.value === answer);
    emitQuestionAnsweredActivity({
      sessionId,
      toolType: "thermometer",
      promptText,
      annotationId: created.id,
      answerSummary: answerOption?.label ?? String(answer),
      createdByUid: senderUid ?? undefined,
    });
  }

  onSuccess();
}
