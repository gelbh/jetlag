import { useEffect, useRef } from "react";
import { listOrphanWalkingThermometerQuestionIds } from "../../domain/questions";
import type { PlayerRole } from "../../domain/session/playerRole";
import type { PendingQuestionRecord } from "../../domain/session/sessionChat";

export function useCancelOrphanThermometerWalks(args: {
  sessionId: string | null;
  myUid: string | null;
  myRole: PlayerRole | null;
  memberUids: readonly string[];
  pendingQuestions: readonly PendingQuestionRecord[];
  cancelThermometerWalk: (input: {
    sessionId: string;
    pendingQuestionId: string;
    senderUid: string;
    senderRole: PlayerRole;
    reason: "orphan";
  }) => Promise<void>;
}): void {
  const {
    sessionId,
    myUid,
    myRole,
    memberUids,
    pendingQuestions,
    cancelThermometerWalk,
  } = args;
  const handledIdsRef = useRef(new Set<string>());

  useEffect(() => {
    handledIdsRef.current = new Set();
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId || !myUid || myRole !== "seeker") {
      return;
    }

    const orphanIds = listOrphanWalkingThermometerQuestionIds(
      pendingQuestions,
      memberUids,
    );

    for (const pendingQuestionId of orphanIds) {
      if (handledIdsRef.current.has(pendingQuestionId)) {
        continue;
      }
      handledIdsRef.current.add(pendingQuestionId);

      void cancelThermometerWalk({
        sessionId,
        pendingQuestionId,
        senderUid: myUid,
        senderRole: myRole,
        reason: "orphan",
      }).catch(() => {
        handledIdsRef.current.delete(pendingQuestionId);
      });
    }
  }, [
    cancelThermometerWalk,
    memberUids,
    myRole,
    myUid,
    pendingQuestions,
    sessionId,
  ]);
}
