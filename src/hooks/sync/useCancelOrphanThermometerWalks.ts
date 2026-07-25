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
 * Auto-cancels abandoned thermometer walks:
 * - Orphans (creator left): any seeker (Firestore rules allow).
 * - Stale (max duration + dead/missing GPS): session host only (rules allow
 *   host cancel; peer seekers cannot cancel another member's walk).
 * Stale detection uses the shared 15s clock so time alone can cross thresholds.
 * Skips stale evaluation until at least one seeker location row exists so an
 * empty initial sync does not look like "location missing."
 */
export function useCancelOrphanThermometerWalks(args: {
  sessionId: string | null;
  myUid: string | null;
  myRole: PlayerRole | null;
  isHost: boolean;
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
    isHost,
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
    if (!sessionId || !myUid || !myRole) {
      return;
    }

    const canCancelOrphans = myRole === "seeker";
    const canCancelStale = isHost;
    if (!canCancelOrphans && !canCancelStale) {
      return;
    }

    const now = nowMs ? nowMs() : clockMs;
    if (!now) {
      return;
    }

    const orphanIds = canCancelOrphans
      ? listOrphanWalkingThermometerQuestionIds(pendingQuestions, memberUids)
      : [];
    const orphanIdSet = new Set(orphanIds);

    let staleIds: string[] = [];
    if (canCancelStale && seekerLocations.length > 0) {
      const walkerLocationUpdatedAtByUid = new Map<string, string | null>();
      for (const location of seekerLocations) {
        walkerLocationUpdatedAtByUid.set(location.uid, location.updatedAt);
      }
      staleIds = listStaleWalkingThermometerQuestionIds(
        pendingQuestions,
        walkerLocationUpdatedAtByUid,
        now,
      );
    }

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
    isHost,
    memberUids,
    myRole,
    myUid,
    nowMs,
    pendingQuestions,
    seekerLocations,
    sessionId,
  ]);
}
