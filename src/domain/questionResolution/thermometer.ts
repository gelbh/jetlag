import type { Feature, LineString } from "geojson";
import type { AnnotationRecord } from "../annotations";
import { MAP_ANNOTATION_COLORS } from "../mapAnnotationColors";
import {
  thermometerHotterTowards,
  type ThermometerAnswer,
} from "../thermometerQuestions";
import type { PendingQuestionRecord } from "../sessionChat";

export function resolveThermometerPendingQuestion(
  pending: PendingQuestionRecord,
  answer: ThermometerAnswer,
): Omit<AnnotationRecord, "id" | "sessionId" | "status"> {
  const geometry = JSON.parse(
    pending.placement.geometryJson,
  ) as Feature<LineString>;
  const metadata = pending.placement.metadata;

  return {
    type: "thermometer",
    geometry,
    metadata: {
      ...metadata,
      createdAt: new Date().toISOString(),
      hotterTowards: thermometerHotterTowards(answer),
      thermometerAnswer: answer,
      color: MAP_ANNOTATION_COLORS.elimination,
    },
  };
}

export function thermometerAnswerFromReplyId(
  replyId: string,
): ThermometerAnswer | null {
  if (replyId === "hotter" || replyId === "colder") {
    return replyId;
  }

  return null;
}
