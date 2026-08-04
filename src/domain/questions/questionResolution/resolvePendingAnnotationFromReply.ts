import type { AnnotationRecord, GameArea } from "../../map/annotations";
import type { PendingQuestionRecord } from "../../session/activity/sessionChat";
import {
  matchingAnswerFromReplyId,
  resolveMatchingPendingQuestion,
} from "./matching";
import {
  measuringAnswerFromReplyId,
  resolveMeasuringPendingQuestion,
} from "./measuring";
import {
  radarAnswerFromReplyId,
  resolveRadarPendingQuestion,
} from "./radar";
import {
  resolveTentaclePendingQuestion,
  tentacleAnswerFromReplyId,
} from "./tentacle";
import {
  resolveThermometerPendingQuestion,
  thermometerAnswerFromReplyId,
} from "./thermometer";

export async function resolvePendingAnnotationFromReply(
  pending: PendingQuestionRecord,
  replyId: string,
  gameArea: GameArea,
): Promise<Omit<AnnotationRecord, "id" | "sessionId" | "status"> | null> {
  switch (pending.toolType) {
    case "radar": {
      const radarAnswer = radarAnswerFromReplyId(replyId);
      if (!radarAnswer) {
        return null;
      }

      return resolveRadarPendingQuestion(pending, radarAnswer);
    }
    case "thermometer": {
      const thermoAnswer = thermometerAnswerFromReplyId(replyId);
      if (!thermoAnswer) {
        return null;
      }

      return resolveThermometerPendingQuestion(pending, thermoAnswer);
    }
    case "measuring": {
      const measuringAnswer = measuringAnswerFromReplyId(replyId);
      if (!measuringAnswer) {
        return null;
      }

      return resolveMeasuringPendingQuestion(
        pending,
        measuringAnswer,
        gameArea,
      );
    }
    case "matching": {
      const matchingAnswer = matchingAnswerFromReplyId(replyId);
      if (!matchingAnswer) {
        return null;
      }

      return resolveMatchingPendingQuestion(pending, matchingAnswer, gameArea);
    }
    case "tentacle": {
      return resolveTentaclePendingQuestion(
        pending,
        tentacleAnswerFromReplyId(replyId),
        gameArea,
      );
    }
    case "photo":
      return null;
    default:
      return null;
  }
}
