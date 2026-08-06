import { useEffect, useRef } from "react";
import type { AnnotationRecord, GameArea } from "../../domain/map/annotations";
import { isStaleAfterReset } from "../../domain/session/meta/sessionReset";
import { resolvePendingAnnotationFromReply } from "../../domain/questions/questionResolution/resolvePendingAnnotationFromReply";
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
  /**
   * Session annotation ids (incl. soft-deleted). Content-stable key for effect
   * deps — join sorted ids; do not pass a fresh Set identity each render.
   */
  knownAnnotationIdsKey?: string;
  /** Latest known ids; read via ref after awaits so reload hydration is visible. */
  knownAnnotationIds?: ReadonlySet<string>;
}

async function resolvePendingQuestion(
  pending: PendingQuestionRecord,
  gameArea: GameArea,
): Promise<Omit<AnnotationRecord, "id" | "sessionId" | "status"> | null> {
  const answer = pending.answer;
  const replyId =
    typeof answer === "string" ? answer : answer != null ? String(answer) : "";
  if (!replyId) {
    return null;
  }

  return resolvePendingAnnotationFromReply(pending, replyId, gameArea);
}

export function usePendingQuestionResolver({
  sessionId,
  enabled,
  pendingQuestions,
  createAnnotation,
  gameArea,
  sessionResetAt,
  knownAnnotationIdsKey = "",
  knownAnnotationIds,
}: UsePendingQuestionResolverParams) {
  const resolvingRef = useRef(new Set<string>());
  const knownAnnotationIdsRef = useRef(knownAnnotationIds);

  useEffect(() => {
    knownAnnotationIdsRef.current = knownAnnotationIds;
  }, [knownAnnotationIds]);

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
        let annotationAlreadyKnown = false;
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

          // Read ref after await so annotation baseline hydration is visible
          // (reload wipe → empty set must not lock us into a rebuild).
          if (knownAnnotationIdsRef.current?.has(pending.id)) {
            annotationAlreadyKnown = true;
            await updatePendingQuestion(sessionId, pending.id, {
              status: "resolved",
              resolvedAnnotationId: pending.id,
            });
            return;
          }

          const annotation = await resolvePendingQuestion(pending, gameArea);

          // Hydration may have landed during geometry work — complete without write.
          if (knownAnnotationIdsRef.current?.has(pending.id)) {
            annotationAlreadyKnown = true;
            await updatePendingQuestion(sessionId, pending.id, {
              status: "resolved",
              resolvedAnnotationId: pending.id,
            });
            return;
          }

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
          // After annotation write OR known existing annotation, complete to resolved
          // (not cancel) to avoid orphan shade + cancelled Q.
          const shouldComplete =
            annotationCreated ||
            annotationAlreadyKnown ||
            Boolean(knownAnnotationIdsRef.current?.has(pending.id));
          if (shouldComplete) {
            try {
              await updatePendingQuestion(sessionId, pending.id, {
                status: "resolved",
                resolvedAnnotationId: pending.id,
              });
            } catch {
              // Best-effort complete failed — keep guard for this mount.
            }
          } else {
            try {
              await updatePendingQuestion(sessionId, pending.id, {
                status: "cancelled",
              });
            } catch {
              // Cancel write failed — still keep the guard for this session mount.
            }
          }
          capturePendingResolveFailure(error, {
            toolType: pending.toolType,
            pendingQuestionId: pending.id,
          });
        }
      })();
    }
  }, [
    createAnnotation,
    enabled,
    gameArea,
    knownAnnotationIdsKey,
    pendingQuestions,
    sessionId,
    sessionResetAt,
  ]);
}
