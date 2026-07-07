import { useEffect, useRef } from "react";
import type { AnnotationRecord, GameArea } from "../../domain/map/annotations";
import {
  radarAnswerFromReplyId,
  resolveRadarPendingQuestion,
} from "../../domain/questions/questionResolution/radar";
import {
  resolveThermometerPendingQuestion,
  thermometerAnswerFromReplyId,
} from "../../domain/questions/questionResolution/thermometer";
import {
  resolveMeasuringPendingQuestion,
  measuringAnswerFromReplyId,
} from "../../domain/questions/questionResolution/measuring";
import {
  resolveMatchingPendingQuestion,
  matchingAnswerFromReplyId,
} from "../../domain/questions/questionResolution/matching";
import {
  resolveTentaclePendingQuestion,
} from "../../domain/questions/questionResolution/tentacle";
import type { PendingQuestionRecord } from "../../domain/session/sessionChat";
import { updatePendingQuestion } from "../../services/firestore/firestoreSessionExtras";

interface UsePendingQuestionResolverParams {
  sessionId: string | undefined;
  enabled: boolean;
  pendingQuestions: readonly PendingQuestionRecord[];
  createAnnotation: (
    annotation: Omit<AnnotationRecord, "id" | "sessionId" | "status">,
  ) => Promise<AnnotationRecord>;
  gameArea: GameArea;
}

async function resolvePendingQuestion(
  pending: PendingQuestionRecord,
  gameArea: GameArea,
): Promise<Omit<AnnotationRecord, "id" | "sessionId" | "status"> | null> {
  const answer = pending.answer;

  switch (pending.toolType) {
    case "radar": {
      const radarAnswer =
        typeof answer === "string"
          ? radarAnswerFromReplyId(answer)
          : radarAnswerFromReplyId(String(answer));
      if (!radarAnswer) {
        return null;
      }

      return resolveRadarPendingQuestion(pending, radarAnswer);
    }
    case "thermometer": {
      const thermoAnswer =
        typeof answer === "string"
          ? thermometerAnswerFromReplyId(answer)
          : thermometerAnswerFromReplyId(String(answer));
      if (!thermoAnswer) {
        return null;
      }

      return resolveThermometerPendingQuestion(pending, thermoAnswer);
    }
    case "measuring": {
      const measuringAnswer =
        typeof answer === "string"
          ? measuringAnswerFromReplyId(answer)
          : measuringAnswerFromReplyId(String(answer));
      if (!measuringAnswer) {
        return null;
      }

      return resolveMeasuringPendingQuestion(pending, measuringAnswer, gameArea);
    }
    case "matching": {
      const matchingAnswer =
        typeof answer === "string"
          ? matchingAnswerFromReplyId(answer)
          : matchingAnswerFromReplyId(String(answer));
      if (!matchingAnswer) {
        return null;
      }

      return resolveMatchingPendingQuestion(pending, matchingAnswer, gameArea);
    }
    case "tentacle": {
      const tentacleAnswer =
        typeof answer === "string" ? answer : String(answer);
      return resolveTentaclePendingQuestion(pending, tentacleAnswer, gameArea);
    }
    case "photo":
      return null;
    default:
      return null;
  }
}

export function usePendingQuestionResolver({
  sessionId,
  enabled,
  pendingQuestions,
  createAnnotation,
  gameArea,
}: UsePendingQuestionResolverParams) {
  const resolvingRef = useRef(new Set<string>());

  useEffect(() => {
    if (!enabled || !sessionId) {
      return;
    }

    const answered = pendingQuestions.filter(
      (question) => question.status === "answered",
    );

    for (const pending of answered) {
      if (resolvingRef.current.has(pending.id)) {
        continue;
      }

      resolvingRef.current.add(pending.id);

      void (async () => {
        try {
          const annotation = await resolvePendingQuestion(pending, gameArea);
          if (!annotation) {
            if (pending.toolType === "photo") {
              await updatePendingQuestion(sessionId, pending.id, {
                status: "resolved",
              });
              return;
            }

            await updatePendingQuestion(sessionId, pending.id, {
              status: "cancelled",
            });
            return;
          }

          const created = await createAnnotation(annotation);

          await updatePendingQuestion(sessionId, pending.id, {
            status: "resolved",
            resolvedAnnotationId: created.id,
          });
        } catch {
          resolvingRef.current.delete(pending.id);
        }
      })();
    }
  }, [createAnnotation, enabled, gameArea, pendingQuestions, sessionId]);
}
