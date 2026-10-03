import type { Feature, LineString } from "geojson";
import { useCallback, useRef } from "react";
import type { LatLngTuple } from "@/domain/geometry/gameArea/geometry";
import { buildThermometerLineGeometry } from "@/domain/questions";
import {
  createMessageId,
  createPendingQuestionId,
  type GameReplyOption,
  type PendingQuestionPlacement,
  type PendingQuestionToolType,
  type SessionMessageRecord,
} from "@/domain/session/activity/sessionChat";
import type { PlayerRole } from "@/domain/session/players/playerRole";
import { serverNowIso } from "@/services/core/time/serverClock";
import { commitWrite } from "@/services/firestore/commitWrite";
import {
  getPendingQuestionStatus,
  postGameSystemMessage,
  THERMOMETER_WALK_CANCEL_TEXT,
  type ThermometerWalkCancelReason,
  writeAskedQuestionBatch,
  writePendingQuestionUpdateBatch,
} from "@/services/firestore/firestoreSessionExtras";
import {
  emitPhotoAskedActivity,
  emitQuestionAskedActivity,
  emitQuestionCancelledActivity,
  emitThermometerWalkSeparatedActivity,
  emitThermometerWalkStartedActivity,
  isAnnotationQuestionTool,
} from "@/services/session/emitSessionActivity";

function gameSystemMessage(
  sessionId: string,
  senderUid: string,
  senderRole: PlayerRole,
  text: string,
): SessionMessageRecord {
  return {
    id: createMessageId(),
    sessionId,
    channel: "game",
    senderUid,
    senderRole,
    createdAt: serverNowIso(),
    kind: "system",
    text,
  };
}

export interface SubmitPendingQuestionInput {
  sessionId: string;
  senderUid: string;
  senderRole: PlayerRole;
  toolType: PendingQuestionToolType;
  promptText: string;
  replyOptions: GameReplyOption[];
  placement: PendingQuestionPlacement;
  status?: "pending" | "walking";
  cardDraw?: number;
  cardKeep?: number;
}

/**
 * Question writes are fire-and-track (`commitWrite`): each lands in the local
 * Firestore cache at once and syncs when signal returns. Nothing here awaits a
 * server ack, so the UI never hangs in a dead zone; rejections surface via the
 * write ledger instead of throwing to the caller.
 */
export function usePendingQuestionActions() {
  const submitInFlightRef = useRef(false);

  const submitPendingQuestion = useCallback(
    ({
      sessionId,
      senderUid,
      senderRole,
      toolType,
      promptText,
      replyOptions,
      placement,
      status = "pending",
      cardDraw,
      cardKeep,
    }: SubmitPendingQuestionInput): string | undefined => {
      // Double-tap guard only: the body is synchronous now that writes are not awaited.
      if (submitInFlightRef.current) {
        return undefined;
      }

      submitInFlightRef.current = true;
      try {
        const pendingQuestionId = createPendingQuestionId();
        const messageId = createMessageId();
        const createdAt = serverNowIso();
        const walking = status === "walking";

        commitWrite("question.ask", () =>
          writeAskedQuestionBatch(
            sessionId,
            {
              id: pendingQuestionId,
              sessionId,
              toolType,
              createdByUid: senderUid,
              createdAt,
              status,
              placement,
              replyOptions,
              promptText,
              cardDraw,
              cardKeep,
              // Walking asks open their answer window when the walk completes.
              ...(walking ? {} : { answerableAt: createdAt }),
            },
            walking
              ? {
                  id: messageId,
                  sessionId,
                  channel: "game",
                  senderUid,
                  senderRole,
                  createdAt,
                  kind: "system",
                  text: promptText,
                }
              : {
                  id: messageId,
                  sessionId,
                  channel: "game",
                  senderUid,
                  senderRole,
                  createdAt,
                  kind: "question",
                  pendingQuestionId,
                  toolType,
                  promptText,
                  replyOptions,
                  status: "pending",
                },
          ),
        );

        if (walking) {
          emitThermometerWalkStartedActivity({
            sessionId,
            pendingQuestionId,
            promptText,
            createdByUid: senderUid,
          });
        } else if (toolType === "photo") {
          emitPhotoAskedActivity({
            sessionId,
            pendingQuestionId,
            promptText,
            createdByUid: senderUid,
          });
        } else if (isAnnotationQuestionTool(toolType)) {
          emitQuestionAskedActivity({
            sessionId,
            toolType,
            promptText,
            pendingQuestionId,
            createdByUid: senderUid,
          });
        }

        return pendingQuestionId;
      } finally {
        submitInFlightRef.current = false;
      }
    },
    [],
  );

  const completeThermometerWalk = useCallback(
    ({
      sessionId,
      pendingQuestionId,
      senderUid,
      senderRole,
      startPoint,
      endPoint,
      distanceMeters,
      promptText,
      replyOptions,
      cardDraw,
      cardKeep,
    }: {
      sessionId: string;
      pendingQuestionId: string;
      senderUid: string;
      senderRole: PlayerRole;
      startPoint: LatLngTuple;
      endPoint: LatLngTuple;
      distanceMeters: number;
      promptText: string;
      replyOptions: GameReplyOption[];
      cardDraw?: number;
      cardKeep?: number;
    }): void => {
      const geometry: Feature<LineString> = buildThermometerLineGeometry(startPoint, endPoint);
      const answerableAt = serverNowIso();

      commitWrite("question.ask", () =>
        writePendingQuestionUpdateBatch(sessionId, {
          questionId: pendingQuestionId,
          questionPatch: {
            status: "pending",
            placement: {
              geometryJson: JSON.stringify(geometry),
              metadata: {
                thermometerDistanceMeters: distanceMeters,
              },
            },
            promptText,
            replyOptions,
            answerableAt,
            cardDraw,
            cardKeep,
          },
          newMessage: {
            id: createMessageId(),
            sessionId,
            channel: "game",
            senderUid,
            senderRole,
            createdAt: answerableAt,
            kind: "question",
            pendingQuestionId,
            toolType: "thermometer",
            promptText,
            replyOptions,
            status: "pending",
          },
        }),
      );

      emitThermometerWalkSeparatedActivity({
        sessionId,
        pendingQuestionId,
        promptText,
        createdByUid: senderUid,
      });
    },
    [],
  );

  const answerPendingQuestion = useCallback(
    (
      sessionId: string,
      pendingQuestionId: string,
      messageId: string,
      answer: unknown,
      selectedReply: string,
      options?: {
        deadlineExpired?: boolean;
        senderUid?: string;
        senderRole?: PlayerRole;
      },
    ): void => {
      const lateNotice =
        options?.deadlineExpired && options.senderUid && options.senderRole
          ? gameSystemMessage(
              sessionId,
              options.senderUid,
              options.senderRole,
              "Answer received late. Hider forfeits card draw for this question.",
            )
          : undefined;

      commitWrite("question.answer", () =>
        writePendingQuestionUpdateBatch(sessionId, {
          questionId: pendingQuestionId,
          questionPatch: {
            answer,
            status: "answered",
            ...(options?.deadlineExpired ? { answeredLate: true } : {}),
          },
          gameMessage: { id: messageId, patch: { selectedReply, status: "answered" } },
          newMessage: lateNotice,
        }),
      );
    },
    [],
  );

  const postSystemMessage = useCallback(
    (sessionId: string, senderUid: string, senderRole: PlayerRole, text: string): void => {
      commitWrite("system.message", () =>
        postGameSystemMessage(sessionId, senderUid, senderRole, text, createMessageId()),
      );
    },
    [],
  );

  const cancelThermometerWalk = useCallback(
    async ({
      sessionId,
      pendingQuestionId,
      senderUid,
      senderRole,
      reason,
    }: {
      sessionId: string;
      pendingQuestionId: string;
      senderUid: string;
      senderRole: PlayerRole;
      reason: ThermometerWalkCancelReason;
    }) => {
      const status = await getPendingQuestionStatus(sessionId, pendingQuestionId);
      if (status !== "walking") {
        return;
      }

      commitWrite("question.cancel", () =>
        writePendingQuestionUpdateBatch(sessionId, {
          questionId: pendingQuestionId,
          questionPatch: { status: "cancelled" },
          newMessage: gameSystemMessage(
            sessionId,
            senderUid,
            senderRole,
            THERMOMETER_WALK_CANCEL_TEXT[reason],
          ),
        }),
      );

      emitQuestionCancelledActivity({
        sessionId,
        toolType: "thermometer",
        promptText: "Thermometer walk",
        pendingQuestionId,
        createdByUid: senderUid,
      });
    },
    [],
  );

  const dismissExpiredPendingQuestion = useCallback(
    async (options: {
      sessionId: string;
      pendingQuestionId: string;
      messageId: string;
      senderUid: string;
      senderRole: PlayerRole;
      toolType: PendingQuestionToolType;
      promptText: string;
    }) => {
      const status = await getPendingQuestionStatus(options.sessionId, options.pendingQuestionId);
      if (status !== "pending") {
        return;
      }

      commitWrite("question.cancel", () =>
        writePendingQuestionUpdateBatch(options.sessionId, {
          questionId: options.pendingQuestionId,
          questionPatch: { status: "cancelled" },
          gameMessage: { id: options.messageId, patch: { status: "cancelled" } },
          newMessage: gameSystemMessage(
            options.sessionId,
            options.senderUid,
            options.senderRole,
            "Expired question dismissed. You can ask again.",
          ),
        }),
      );
      emitQuestionCancelledActivity({
        sessionId: options.sessionId,
        toolType: options.toolType,
        promptText: options.promptText,
        pendingQuestionId: options.pendingQuestionId,
        createdByUid: options.senderUid,
      });
    },
    [],
  );

  return {
    submitPendingQuestion,
    completeThermometerWalk,
    answerPendingQuestion,
    postSystemMessage,
    cancelThermometerWalk,
    dismissExpiredPendingQuestion,
  };
}
