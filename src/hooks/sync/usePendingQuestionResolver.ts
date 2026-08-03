import { useEffect, useRef } from "react";
import type { AnnotationRecord, GameArea } from "../../domain/map/annotations";
import { isStaleAfterReset } from "../../domain/session/meta/sessionReset";
import {
  radarAnswerFromReplyId,
  resolveRadarPendingQuestion,
} from "../../domain/questions/ui";
import {
  resolveThermometerPendingQuestion,
  thermometerAnswerFromReplyId,
} from "../../domain/questions/ui";
import {
  resolveMeasuringPendingQuestion,
  measuringAnswerFromReplyId,
} from "../../domain/questions/ui";
import {
  resolveMatchingPendingQuestion,
  matchingAnswerFromReplyId,
} from "../../domain/questions/ui";
import {
  resolveTentaclePendingQuestion,
} from "../../domain/questions/ui";
import type { PendingQuestionRecord } from "../../domain/session/activity/sessionChat";
import {
  getPendingQuestionStatus,
  updatePendingQuestion,
} from "../../services/firestore/firestoreSessionExtras";
import { capturePendingResolveFailure } from "../../services/core/analytics/sentry";
import {
  answerSummaryFromPendingReply,
  emitPhotoAnsweredActivity,
  emitQuestionAnsweredActivity,
  isAnnotationQuestionTool,
} from "../../services/session/emitSessionActivity";

interface UsePendingQuestionResolverParams {
  sessionId: string | undefined;
  enabled: boolean;
  pendingQuestions: readonly PendingQuestionRecord[];
  createAnnotation: (
    annotation: Omit<AnnotationRecord, "id" | "sessionId" | "status"> & {
      id?: string;
    },
  ) => Promise<AnnotationRecord>;
  gameArea: GameArea;
  sessionResetAt?: string;
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

      return await resolveMatchingPendingQuestion(
        pending,
        matchingAnswer,
        gameArea,
      );
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
  sessionResetAt,
}: UsePendingQuestionResolverParams) {
  const resolvingRef = useRef(new Set<string>());

  useEffect(() => {
    resolvingRef.current = new Set();
  }, [sessionId]);

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
        let annotationCreated = false;
        try {
          if (isStaleAfterReset(pending.createdAt, sessionResetAt)) {
            return;
          }

          const latestStatus = await getPendingQuestionStatus(
            sessionId,
            pending.id,
          );
          if (latestStatus !== "answered") {
            return;
          }

          const annotation = await resolvePendingQuestion(pending, gameArea);
          if (!annotation) {
            if (pending.toolType === "photo") {
              await updatePendingQuestion(sessionId, pending.id, {
                status: "resolved",
              });
              emitPhotoAnsweredActivity({
                sessionId,
                pendingQuestionId: pending.id,
                promptText: pending.promptText,
                answerSummary: answerSummaryFromPendingReply(
                  pending.answer,
                  pending.replyOptions,
                ),
              });
              return;
            }

            await updatePendingQuestion(sessionId, pending.id, {
              status: "cancelled",
            });
            return;
          }

          // Stable id so concurrent seekers/observers overwrite one doc, not two.
          const created = await createAnnotation({
            ...annotation,
            id: pending.id,
          });
          annotationCreated = true;

          await updatePendingQuestion(sessionId, pending.id, {
            status: "resolved",
            resolvedAnnotationId: created.id,
          });

          if (isAnnotationQuestionTool(pending.toolType)) {
            emitQuestionAnsweredActivity({
              sessionId,
              toolType: pending.toolType,
              promptText: pending.promptText,
              pendingQuestionId: pending.id,
              annotationId: created.id,
              answerSummary: answerSummaryFromPendingReply(
                pending.answer,
                pending.replyOptions,
              ),
              answeredLate: Boolean(pending.answeredLate),
            });
          }
        } catch (error) {
          // Soft-fail: cancel once and keep the in-flight guard so reload/effect
          // loops cannot re-enter resolve (tentacle/measuring OOM thrash). On reconnect,
          // resolvingRef clears when sessionId changes, allowing one bounded retry.
          if (!annotationCreated) {
            try {
              await updatePendingQuestion(sessionId, pending.id, {
                status: "cancelled",
              });
            } catch {
              // Cancel write failed — still keep the guard for this session mount.
              // The guard will be cleared when sessionId changes (at line 127), allowing
              // one retry on reconnect. This prevents transient failures from becoming permanent.
              // Failure reporting continues below to ensure all errors are captured.
            }
          }
          // Report failure regardless of annotation state to ensure error visibility
          capturePendingResolveFailure(error, {
            toolType: pending.toolType,
            pendingQuestionId: pending.id,
          });
        }
      })();
    }
  }, [createAnnotation, enabled, gameArea, pendingQuestions, sessionId, sessionResetAt]);
}
