import { useEffect, useRef } from "react";
import {
  listOrphanWalkingThermometerQuestionIds,
  listStaleWalkingThermometerQuestionIds,
} from "../../domain/questions";
import type { PlayerRole } from "../../domain/session/playerRole";
import type {
  PendingQuestionRecord,
  PlayerLocationRecord,
} from "../../domain/session/sessionChat";
import type { ThermometerWalkCancelReason } from "../../services/firestore/firestoreSessionExtras";
import { useStaleWalkNowMs } from "./useStaleWalkNowMs";

/**
 * Auto-cancels abandoned thermometer walks for seekers:
 * orphan creators (left session) and stale walks (max duration + dead GPS).
 * Stale detection is driven by the shared 15s stale-walk clock — not only
 * Firestore snapshot churn — so time alone can cross the threshold.
 */
export function useCancelOrphanThermometerWalks(args: {
  sessionId: string | null;
  myUid: string | null;
  myRole: PlayerRole | null;
  memberUids: readonly string[];
  pendingQuestions: readonly PendingQuestionRecord[];
  seekerLocations: readonly PlayerLocationRecord[];
  cancelThermometerWalk: (input: {
    sessionId: string;
    pendingQuestionId: string;
    senderUid: string;
    senderRole: PlayerRole;
    reason: Extract<ThermometerWalkCancelReason, "orphan" | "stale">;
  }) => Promise<void>;
  /** Override clock (tests). Production uses the shared stale-walk tick. */
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
    nowMs,
  } = args;
  const clockMs = useStaleWalkNowMs();
  const handledIdsRef = useRef(new Set<string>());

  useEffect(() => {
    handledIdsRef.current = new Set();
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId || !myUid || myRole !== "seeker") {
      return;
    }

    const now = nowMs ? nowMs() : clockMs;
    if (!now) {
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
      now,
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
    clockMs,
    memberUids,
    myRole,
    myUid,
    nowMs,
    pendingQuestions,
    seekerLocations,
    sessionId,
  ]);
}
