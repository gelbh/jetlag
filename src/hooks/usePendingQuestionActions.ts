import { useCallback, useRef } from "react";
import type { Feature, LineString } from "geojson";
import type { PendingQuestionToolType } from "../domain/sessionChat";
import type { PlayerRole } from "../domain/playerRole";
import type { GameReplyOption } from "../domain/sessionChat";
import {
  createMessageId,
  createPendingQuestionId,
  type PendingQuestionPlacement,
} from "../domain/sessionChat";
import { buildThermometerLineGeometry } from "../domain/thermometerWalk";
import type { LatLngTuple } from "../domain/geometry";
import {
  postGameSystemMessage,
  updateGameMessageAnswer,
  updatePendingQuestion,
  writePendingQuestion,
  writeSessionMessage,
} from "../services/firestoreSessionExtras";

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

export function usePendingQuestionActions() {
  const submitInFlightRef = useRef(false);

  const submitPendingQuestion = useCallback(
    async ({
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
    }: SubmitPendingQuestionInput) => {
      if (submitInFlightRef.current) {
        return;
      }

      submitInFlightRef.current = true;
      try {
      const pendingQuestionId = createPendingQuestionId();
      const messageId = createMessageId();
      const createdAt = new Date().toISOString();
      const answerableAt = status === "pending" ? createdAt : undefined;

      await writePendingQuestion(sessionId, {
        id: pendingQuestionId,
        sessionId,
        toolType,
        createdByUid: senderUid,
        createdAt,
        status,
        placement,
        replyOptions,
        promptText,
        answerableAt,
        cardDraw,
        cardKeep,
      });

      if (status === "walking") {
        await postGameSystemMessage(
          sessionId,
          senderUid,
          senderRole,
          promptText,
          messageId,
        );
        return pendingQuestionId;
      }

      await writeSessionMessage(sessionId, {
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
      });

      return pendingQuestionId;
      } finally {
        submitInFlightRef.current = false;
      }
    },
    [],
  );

  const completeThermometerWalk = useCallback(
    async ({
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
    }) => {
      const geometry: Feature<LineString> = buildThermometerLineGeometry(
        startPoint,
        endPoint,
      );
      const answerableAt = new Date().toISOString();
      const messageId = createMessageId();

      await updatePendingQuestion(sessionId, pendingQuestionId, {
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
      });

      await writeSessionMessage(sessionId, {
        id: messageId,
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
      });
    },
    [],
  );

  const answerPendingQuestion = useCallback(
    async (
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
    ) => {
      await updatePendingQuestion(sessionId, pendingQuestionId, {
        answer,
        status: "answered",
        ...(options?.deadlineExpired ? { answeredLate: true } : {}),
      });
      await updateGameMessageAnswer(sessionId, messageId, selectedReply);

      if (
        options?.deadlineExpired &&
        options.senderUid &&
        options.senderRole
      ) {
        await postGameSystemMessage(
          sessionId,
          options.senderUid,
          options.senderRole,
          "Answer received late — hider forfeits card draw for this question.",
          createMessageId(),
        );
      }
    },
    [],
  );

  const postSystemMessage = useCallback(
    async (
      sessionId: string,
      senderUid: string,
      senderRole: PlayerRole,
      text: string,
    ) => {
      await postGameSystemMessage(
        sessionId,
        senderUid,
        senderRole,
        text,
        createMessageId(),
      );
    },
    [],
  );

  return {
    submitPendingQuestion,
    completeThermometerWalk,
    answerPendingQuestion,
    postSystemMessage,
  };
}
