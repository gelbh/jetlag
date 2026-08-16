import { useEffect, useRef } from "react";
import type { AnnotationRecord, GameArea } from "../../domain/map/annotations";
import { isStaleAfterReset } from "../../domain/session/meta/sessionReset";
import { resolvePendingAnnotationFromReply } from "../../domain/questions/questionResolution/resolvePendingAnnotationFromReply";
import type { PendingQuestionRecord } from "../../domain/session/activity/sessionChat";
import {
  getPendingQuestionStatus,
  updatePendingQuestion,
} from "../../services/firestore/firestoreSessionExtras";
import { isFirestorePermissionDenied } from "../../services/firestore/sessions/shared";
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
  /** Soft-delete orphan when cancel wins after create (race). */
  deleteAnnotation?: (id: string) => Promise<void>;
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

type TerminalWriteOutcome =
  | "committed"
  | "already-resolved"
  | "already-cancelled";

function shouldEmitAnsweredActivity(outcome: TerminalWriteOutcome): boolean {
  return outcome === "committed" || outcome === "already-resolved";
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

/**
 * Seeker resolve is often concurrent (multi-tab). Losing the race yields
 * permission-denied once status is already resolved/cancelled — treat as done
 * (JETLAG-2 photo). Callers must not emit "answered" activity on already-cancelled.
 */
async function writePendingTerminalStatus(
  sessionId: string,
  pendingId: string,
  patch: {
    status: "resolved" | "cancelled";
    resolvedAnnotationId?: string;
  },
): Promise<TerminalWriteOutcome> {
  try {
    await updatePendingQuestion(sessionId, pendingId, patch);
    return "committed";
  } catch (error) {
    if (!isFirestorePermissionDenied(error)) {
      throw error;
    }
    const latest = await getPendingQuestionStatus(sessionId, pendingId);
    if (latest === "resolved") {
      return "already-resolved";
    }
    if (latest === "cancelled") {
      return "already-cancelled";
    }
    throw error;
  }
}

function isKnownAnnotationForPending(
  pending: PendingQuestionRecord,
  knownIds: ReadonlySet<string> | undefined,
): boolean {
  return (
    isAnnotationQuestionTool(pending.toolType) &&
    Boolean(knownIds?.has(pending.id))
  );
}

export function usePendingQuestionResolver({
  sessionId,
  enabled,
  pendingQuestions,
  createAnnotation,
  deleteAnnotation,
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

          // Photo never materializes an annotation — do not treat a coincidental
          // id match as "already known".
          // Read ref after await so annotation baseline hydration is visible
          // (reload wipe → empty set must not lock us into a rebuild).
          if (
            isKnownAnnotationForPending(
              pending,
              knownAnnotationIdsRef.current,
            )
          ) {
            annotationAlreadyKnown = true;
            await writePendingTerminalStatus(sessionId, pending.id, {
              status: "resolved",
              resolvedAnnotationId: pending.id,
            });
            return;
          }

          const annotation = await resolvePendingQuestion(pending, gameArea);

          // Hydration may have landed during geometry work — complete without write.
          if (
            isKnownAnnotationForPending(
              pending,
              knownAnnotationIdsRef.current,
            )
          ) {
            annotationAlreadyKnown = true;
            await writePendingTerminalStatus(sessionId, pending.id, {
              status: "resolved",
              resolvedAnnotationId: pending.id,
            });
            return;
          }

          if (!annotation) {
            if (pending.toolType === "photo") {
              const outcome = await writePendingTerminalStatus(
                sessionId,
                pending.id,
                { status: "resolved" },
              );
              if (shouldEmitAnsweredActivity(outcome)) {
                emitPhotoAnsweredActivity({
                  sessionId,
                  pendingQuestionId: pending.id,
                  promptText: pending.promptText,
                  answerSummary: answerSummaryFromPendingReply(
                    pending.answer,
                    pending.replyOptions,
                  ),
                });
              }
              return;
            }

            await writePendingTerminalStatus(sessionId, pending.id, {
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

          const outcome = await writePendingTerminalStatus(
            sessionId,
            pending.id,
            {
              status: "resolved",
              resolvedAnnotationId: created.id,
            },
          );

          if (outcome === "already-cancelled") {
            // Host/other tab cancelled while we created — drop orphan shade.
            try {
              await deleteAnnotation?.(created.id);
            } catch {
              // Best-effort cleanup; keep in-flight guard.
            }
            return;
          }

          if (
            isAnnotationQuestionTool(pending.toolType) &&
            shouldEmitAnsweredActivity(outcome)
          ) {
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
            isKnownAnnotationForPending(
              pending,
              knownAnnotationIdsRef.current,
            );
          if (shouldComplete) {
            try {
              await writePendingTerminalStatus(sessionId, pending.id, {
                status: "resolved",
                resolvedAnnotationId: pending.id,
              });
            } catch {
              // Best-effort complete failed — keep guard for this mount.
            }
          } else {
            try {
              await writePendingTerminalStatus(sessionId, pending.id, {
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
    deleteAnnotation,
    enabled,
    gameArea,
    knownAnnotationIdsKey,
    pendingQuestions,
    sessionId,
    sessionResetAt,
  ]);
}
