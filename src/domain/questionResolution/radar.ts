import type { Feature, Point } from "geojson";
import type { AnnotationRecord } from "../annotations";
import { MAP_ANNOTATION_COLORS } from "../mapAnnotationColors";
import {
  radarInsideFromAnswer,
  type RadarAnswer,
} from "../radarQuestions";
import type { PendingQuestionRecord } from "../sessionChat";

export function resolveRadarPendingQuestion(
  pending: PendingQuestionRecord,
  answer: RadarAnswer,
): Omit<AnnotationRecord, "id" | "sessionId" | "status"> {
  const geometry = JSON.parse(
    pending.placement.geometryJson,
  ) as Feature<Point>;
  const metadata = pending.placement.metadata;

  return {
    type: "radar",
    geometry,
    metadata: {
      ...metadata,
      createdAt: new Date().toISOString(),
      inside: radarInsideFromAnswer(answer),
      color: MAP_ANNOTATION_COLORS.radar,
    },
  };
}

export function radarAnswerFromReplyId(replyId: string): RadarAnswer | null {
  if (replyId === "yes" || replyId === "no") {
    return replyId;
  }

  return null;
}
