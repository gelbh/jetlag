import { useEffect, useRef } from "react";
import {
  listOrphanWalkingThermometerQuestionIds,
  listStaleWalkingThermometerQuestionIds,
} from "../../domain/questions";
import type { PlayerRole } from "../../domain/session/playerRole";
import type { PendingQuestionRecord } from "../../domain/session/sessionChat";
import type { ThermometerWalkCancelReason } from "../../services/firestore/firestoreSessionExtras";

export function useCancelOrphanThermometerWalks(args: {
  sessionId: string | null;
  myUid: string | null;
  myRole: PlayerRole | null;
  memberUids: readonly string[];
  pendingQuestions: readonly PendingQuestionRecord[];
  seekerLocations: readonly { uid: string; updatedAt: string }[];
  cancelThermometerWalk: (input: {
    sessionId: string;
    pendingQuestionId: string;
    senderUid: string;
    senderRole: PlayerRole;
    reason: Extract<ThermometerWalkCancelReason, "orphan" | "stale">;
  }) => Promise<void>;
  nowMs?: () => number;
}): void {
  const {
    sessionId,
    myUid,
    myRole,
    memberUids,
    pendingQuestions,
    seekerLocations,
    cancelThermometerWalk,
    nowMs = Date.now,
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
    const orphanIdSet = new Set(orphanIds);

    const walkerLocationUpdatedAtByUid = new Map<string, string | null>();
    for (const location of seekerLocations) {
      walkerLocationUpdatedAtByUid.set(location.uid, location.updatedAt);
    }

    const staleIds = listStaleWalkingThermometerQuestionIds(
      pendingQuestions,
      walkerLocationUpdatedAtByUid,
      nowMs(),
    );

    const toCancel: Array<{
      pendingQuestionId: string;
      reason: "orphan" | "stale";
    }> = [
      ...orphanIds.map((pendingQuestionId) => ({
        pendingQuestionId,
        reason: "orphan" as const,
      })),
      ...staleIds
        .filter((id) => !orphanIdSet.has(id))
        .map((pendingQuestionId) => ({
          pendingQuestionId,
          reason: "stale" as const,
        })),
    ];

    for (const { pendingQuestionId, reason } of toCancel) {
      if (handledIdsRef.current.has(pendingQuestionId)) {
        continue;
      }
      handledIdsRef.current.add(pendingQuestionId);

      void cancelThermometerWalk({
        sessionId,
        pendingQuestionId,
        senderUid: myUid,
        senderRole: myRole,
        reason,
      }).catch(() => {
        handledIdsRef.current.delete(pendingQuestionId);
      });
    }
  }, [
    cancelThermometerWalk,
    memberUids,
    myRole,
    myUid,
    nowMs,
    pendingQuestions,
    seekerLocations,
    sessionId,
  ]);
}
