import { useEffect, useState } from "react";
import type { LeaderboardEntry } from "../../domain/game/leaderboard";
import type { LeaderboardBoardSelection } from "../../domain/game/leaderboardBoardPrefs";
import { getLeaderboardSelfEntry } from "../../services/firestore/firestoreLeaderboard";

export function useLeaderboardSelfEntry(
  selection: LeaderboardBoardSelection,
  uid: string | null | undefined,
) {
  const [entry, setEntry] = useState<LeaderboardEntry | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!uid) {
      setEntry(null);
      setError(false);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(false);
    getLeaderboardSelfEntry(
      selection.scope,
      selection.gameSize,
      selection.role,
      selection.metric,
      uid,
    )
      .then((next) => {
        if (cancelled) return;
        setEntry(next);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setEntry(null);
        setError(true);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selection.scope, selection.gameSize, selection.role, selection.metric, uid]);

  return { entry, error, loading };
}
