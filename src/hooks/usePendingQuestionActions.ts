import { useCallback } from "react";
import type { AnnotationType } from "../domain/annotations";
import type { PlayerRole } from "../domain/playerRole";
import type { GameReplyOption } from "../domain/sessionChat";
import {
  createMessageId,
  createPendingQuestionId,
  type PendingQuestionPlacement,
} from "../domain/sessionChat";
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
  toolType: AnnotationType;
  promptText: string;
  replyOptions: GameReplyOption[];
  placement: PendingQuestionPlacement;
}

export function usePendingQuestionActions() {
  const submitPendingQuestion = useCallback(
    async ({
      sessionId,
      senderUid,
      senderRole,
      toolType,
      promptText,
      replyOptions,
      placement,
    }: SubmitPendingQuestionInput) => {
      const pendingQuestionId = createPendingQuestionId();
      const messageId = createMessageId();
      const createdAt = new Date().toISOString();

      await writePendingQuestion(sessionId, {
        id: pendingQuestionId,
        sessionId,
        toolType,
        createdByUid: senderUid,
        createdAt,
        status: "pending",
        placement,
        replyOptions,
        promptText,
      });

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
    ) => {
      await updatePendingQuestion(sessionId, pendingQuestionId, {
        answer,
        status: "answered",
      });
      await updateGameMessageAnswer(sessionId, messageId, selectedReply);
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
    answerPendingQuestion,
    postSystemMessage,
  };
}
